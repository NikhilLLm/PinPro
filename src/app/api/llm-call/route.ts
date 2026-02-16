import { error } from "console";
import Groq from "groq-sdk";
import { NextResponse, NextRequest } from "next/server";
import { tools } from "@/lib/llm/tools";
import { connectToDatabase } from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
const Groq_api = process.env.GROQ_API_KEY;

const client = new Groq({ apiKey: Groq_api });
const system_prompt = `You are a Pinterest visual aesthetics expert and creative design assistant.

Your goal is to help users create stunning pins by finding inspiration, generating ideas, and guiding their creative process.

You have access to tools that help you accomplish tasks. Use the right tool for the job.

When searching for images:
- Craft highly descriptive, aesthetic search queries (not generic ones).
- Example: Instead of "food", use "gourmet burger close up dark moody editorial photography".
- Add style keywords like: "editorial", "cinematic lighting", "minimalist", "warm tones", "professional photography".
- Each image result has an ID, alt text, and photographer. Reference these when discussing results.

When a request is vague, ask a short follow-up question to clarify the mood, style, or category before searching.

Keep responses concise. Use bulleted lists with bold titles. Be creative and inspiring.`;

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { IPexelsPhoto } from "@/models/Pexels";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const { prompt, history = [] } = await request.json()

    await connectToDatabase()

    // Get last 4 messages for context
    const contextHistory = history.slice(-4).map((msg: any) => ({
        role: msg.role,
        content: msg.content
    }));

    const hasHistory = contextHistory.length > 0;
    const lastAssistantMsg = contextHistory
        .filter((m: any) => m.role === "assistant")
        .pop();


    const previouslyShowedImages = lastAssistantMsg?.content?.match(
        /image|photo|picture|pin idea|inspiration|search result/i
    );
    const shouldForceTool = hasHistory && previouslyShowedImages;
    //tools required 
    const formattedTools = tools.map(tool => ({
        type: "function" as const,
        function: {
            name: tool.name,
            description: tool.description,
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Query to search for"
                    }
                },
                required: ["query"]
            }
        }
    }));

    //1.ask llm what to do 
    const initialResponse = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
            {
                role: "system",
                content: system_prompt,
            },
            ...contextHistory,
            {
                role: "user",
                content: prompt
            }
        ],
        tools: formattedTools,
        tool_choice: shouldForceTool ? "required" : "auto"
    })

    const messgae = initialResponse.choices[0].message

    //save chat history
    await ChatHistory.create({
        user_id: session.user.id,
        role: "user",
        context: prompt
    })

    //step 2: check if llm want to call

    if (messgae.tool_calls) {
        const toolCalls = messgae.tool_calls;

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(toolCalls.map(async (toolCall) => {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);
            const tool = tools.find((t) => t.name === toolName);

            if (!tool) {
                console.error(`Tool ${toolName} not found`);
                return { id: toolCall.id, error: "Tool not found" };
            }

            const result = await tool.execute(toolArgs);

            // Clean result for LLM tokens
            const cleanedResult = {
                ...result,
                photos: result.photos.map((p: IPexelsPhoto) => ({
                    id: p.id,
                    alt: p.alt,
                    photographer: p.photographer
                }))
            };

            return {
                id: toolCall.id,
                result: result, // Full data for UI
                cleanedResult: cleanedResult // Stripped data for LLM
            };
        }));

        // Prepare messages for final LLM summary
        const finalMessages = [
            ...contextHistory,
            {
                role: "user",
                content: prompt
            },
            {
                role: "assistant",
                content: messgae.content,
                tool_calls: toolCalls // Must include the calls themselves
            },
            ...toolResults.map(tr => ({
                role: "tool",
                tool_call_id: tr.id,
                content: tr.cleanedResult ? JSON.stringify(tr.cleanedResult) : JSON.stringify({ error: "Tool execution failed" })
            }))
        ];

        // Final response from LLM
        const finalResponse = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: finalMessages as any,
            temperature: 0.8,
            max_completion_tokens: 2000,
            tools: formattedTools,
            tool_choice: "none"
        });

        const finalContent = finalResponse.choices[0].message.content;

        // Store assistant response in history
        await ChatHistory.create({
            user_id: session.user.id,
            role: "assistant",
            context: finalContent
        });

        // Collect all image data from all tool calls
        const allPhotos = toolResults.flatMap(tr => tr.result?.photos || []);

        return Response.json({
            result: finalContent,
            data: { photos: allPhotos } // UI gets all images combined
        });
    }

    // Store assistant response in history (if no tool used)
    await ChatHistory.create({
        user_id: session.user.id,
        role: "assistant",
        context: messgae.content
    })

    //if no tool used
    return Response.json({
        result: messgae.content
    })
}