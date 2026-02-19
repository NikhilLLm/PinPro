import Groq from "groq-sdk";
import { tools } from "@/lib/llm/tools";
import { connectToDatabase } from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
const Groq_api = process.env.GROQ_API_KEY;

const client = new Groq({ apiKey: Groq_api });
const system_prompt = `You are a Pinterest visual aesthetics expert and creative design assistant.

Your goal is to help users create stunning pins by finding inspiration, generating ideas, and guiding their creative process.

You have access to tools: 'Search_Images', 'text_to_image_tool', and 'image_to_image_gen_tool'.

CRITICAL INSTRUCTIONS:
1. NEVER output actual base64 data, Data URIs, or markdown image tags (like ![...](data:...)) in your text response.
2. The UI will automatically display any images you generate or find. Do not try to show them yourself using markdown.
3. Simply describe the creative vision or the result of your action in natural language.
4. If a tool result contains large data, ignore the raw data and just confirm the action worked.

When searching for images:
- Craft highly descriptive, aesthetic search queries with keywords like: "editorial", "cinematic lighting", "minimalist", "professional photography".

INSTRUCTIONS FOR IMAGE-TO-IMAGE GENERATION (CRITICAL):
1. SUBJECT ANCHORING: Use the [REFERENCE IMAGE DESCRIPTION] tags if provided. You MUST include these tags at the beginning of your 'prompt' to anchor the subject.
2. STRENGTH CONTROL: 
   - Use 'strength: 0.3' to KEEP the subject exactly as is (e.g. background swap, color change). 
   - Use 'strength: 0.7' for creative variations.
3. ENHANCEMENT: Append quality tags: "masterpiece, 8k, highly detailed, cinematic lighting".

SUMMARY MODE (FINAL CALL): When tools are finished, ONLY describe the result in text. DO NOT mention properties like 'strength' or 'prompt' in your final message. DO NOT call any more tools.

Keep responses concise. Use bulleted lists with bold titles. Be creative and inspiring.`;

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { IPexelsPhoto, IPexelsResponse } from "@/types/pexels";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return Response.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    const { input, history = [] } = await request.json()

    const isFileAttached = input.url ? "[IMAGE_ATTACHED]" : ""

    await connectToDatabase()

    // Get last 4 messages for context and aggressively strip any base64 images
    const contextHistory = history.slice(-4).map((msg: any) => {
        let content = msg.content;

        // 1. Try JSON scrubbing (most accurate)
        try {
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object' && parsed.url) {
                content = `${parsed.prompt || ""}\n\n[IMAGE_ATTACHED]`;
            }
        } catch (e) { }

        // 2. Fallback regex scrubbing (catches raw strings or broken JSON)
        content = content.replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[IMAGE_DATA]");

        return {
            role: msg.role,
            content: content
        };
    });

    const hasHistory = contextHistory.length > 0;
    const lastAssistantMsg = contextHistory
        .filter((m: any) => m.role === "assistant")
        .pop();


    const previouslyShowedImages = lastAssistantMsg?.content?.match(
        /image|photo|picture|pin idea|inspiration|search result/i
    );

    //tools required 
    const formattedTools = tools.map(tool => {
        const isImageToImage = tool.name === "image_to_image_gen_tool";
        const paramName = isImageToImage ? "prompt" : "query";
        const paramDesc = isImageToImage
            ? "The text prompt describing the changes or additions to the reference image. Anchor the subject descriptively!"
            : "The search query or image generation prompt";

        const properties: any = {
            [paramName]: {
                type: "string",
                description: paramDesc
            }
        };

        if (isImageToImage) {
            properties.strength = {
                type: "number",
                description: "How much to change the image (0.0 to 1.0). Use 0.4 for subtle background swaps/edits, 0.8 for radical changes.",
                minimum: 0,
                maximum: 1
            };
        }

        return {
            type: "function" as const,
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: "object",
                    properties,
                    required: [paramName]
                }
            }
        };
    });
    //0. Analyze attached image if present to give the LLM "eyes"
    let imageDescription = "";
    if (input.url) {
        try {
            const visionResponse = await client.chat.completions.create({
                model: "meta-llama/llama-4-maverick-17b-128e-instruct",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Analyze this image and provide a list of descriptive tags (subject, hair color, clothing details, expression, background) separated by commas. Focus on physical attributes so another AI can recreate this exact character." },
                            { type: "image_url", image_url: { url: input.url } }
                        ]
                    }
                ],
                max_completion_tokens: 300
            });
            imageDescription = visionResponse.choices[0].message.content || "";
        } catch (error) {
            console.error("Vision Analysis failed:", error);
        }
    }

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
                content: (imageDescription ? `[REFERENCE IMAGE DESCRIPTION: ${imageDescription}]\n\n` : "") + input.prompt + isFileAttached
            }
        ],
        tools: formattedTools,
        tool_choice: "auto"
    })

    const messgae = initialResponse.choices[0].message

    //save chat history
    await ChatHistory.create({
        user_id: session.user.id,
        role: "user",
        context: input.prompt
    })

    //step 2: check if llm want to call

    if (messgae.tool_calls) {
        const toolCalls = messgae.tool_calls;

        // Execute all tool calls in parallel
        const toolResults = await Promise.all(toolCalls.map(async (toolCall) => {
            const toolName = toolCall.function.name;
            console.log(toolName);
            const toolArgs = JSON.parse(toolCall.function.arguments);

            // Inject reference image URL specifically for image-to-image tool
            if (toolName === "image_to_image_gen_tool" && input.url) {
                toolArgs.url = input.url;
            }

            const tool = tools.find((t) => t.name === toolName);

            if (!tool) {
                console.error(`Tool ${toolName} not found`);
                return { id: toolCall.id, error: "Tool not found" };
            }

            const result = await tool.execute(toolArgs) as any;

            // Clean result for LLM tokens
            let cleanedResult: any = result;

            if (toolName === "Search_Images") {
                cleanedResult = {
                    ...result,
                    photos: result.photos.map((p: IPexelsPhoto) => ({
                        id: p.id,
                        alt: p.alt,
                        //add image url
                        url: p.src.original,
                        photographer: p.photographer
                    }))
                };
            } else if (toolName === "text_to_image_tool") {
                cleanedResult = {
                    status: "success",
                    message: "Image generated successfully (data hidden)."
                };
            } else if (toolName === "image_to_image_gen_tool") {
                cleanedResult = {
                    status: "success",
                    message: "Reference image processed and new image generated successfully (data hidden)."
                }
            }

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
                content: input.prompt + isFileAttached
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
            messages: [
                {
                    role: "system",
                    content: system_prompt + "\n\nIMPORTANT: The task is COMPLETE. Your response must be text only. DO NOT call any tools. Provide a brief, inspiring summary of the result."
                },
                ...finalMessages
            ] as any,
            temperature: 0.7,
            max_completion_tokens: 1000,
            tool_choice: "none"
        });

        let finalContent = finalResponse.choices[0].message.content || "";

        // Aggressively strip any accidental markdown images or base64 from the assistant's final text
        finalContent = finalContent
            .replace(/!\[.*?\]\(data:.*?\)/g, "[Image Generated]") // Remove md base64 images
            .replace(/!\[.*?\]\(.*?\)/g, "") // Remove all md images
            .replace(/data:image\/[^;]+;base64,[^"\s]+/g, "[DATA]"); // Remove raw base64 strings


        // Store assistant response in history
        await ChatHistory.create({
            user_id: session.user.id,
            role: "assistant",
            context: finalContent
        });

        // Separate results by type
        const pexelsPhotos = toolResults
            .filter(tr => tr.result && "photos" in tr.result)
            .flatMap(tr => (tr.result as any).photos);

        const generatedImages = toolResults
            .filter(tr => tr.result && "format" in tr.result && (tr.result as any).format)
            .map(tr => {
                const res = tr.result as any;
                const toolCall = toolCalls.find(tc => tc.id === tr.id);
                const toolArgs = JSON.parse(toolCall?.function.arguments || "{}");

                return {
                    url: res.format,
                    prompt: toolArgs.query || toolArgs.prompt || "AI Generated"
                };
            });


        return Response.json({
            result: finalContent,
            data: {
                pexelsPhotos,
                generatedImages,

            }
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