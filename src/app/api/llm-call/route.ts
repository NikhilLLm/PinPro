import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";

// Import modular functions
import { analyzeReferenceImage } from "./vision";
import { formatTools, buildImageAnalysisContext, separateResults } from "./toolExecutor";
import { 
    getSystemPrompt, 
    getFinalSummaryPrompt, 
    cleanContextHistory, 
    buildUserMessage, 
    isAskingAboutImages, 
    stripMarkdownImages 
} from "./prompts";
import { executeToolCalls } from "./execute";

const Groq_api = process.env.GROQ_API_KEY;
const client = new Groq({ apiKey: Groq_api });

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { input, history = [] } = await request.json();
    await connectToDatabase();

    // Step 1: Prepare context
    const contextHistory = cleanContextHistory(history);
    let imageDescription = "";
    
    if (input.data?.url) {
        const description = await analyzeReferenceImage(input.data.url);
        imageDescription = description ? `The attached image contains: ${description}` : "";
    }

    // Step 2: Build initial LLM message
    const formattedTools = formatTools();
    const userContent = buildUserMessage(
        input.prompt,
        imageDescription,
        !!input.url,
        input.data?.selected_images
    );

    // Step 3: Initial LLM call - decide if tools needed
    const initialResponse = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
            { role: "system", content: getSystemPrompt() },
            ...contextHistory,
            { role: "user", content: userContent }
        ],
        tools: formattedTools,
        tool_choice: "auto"
    });

    const message = initialResponse.choices[0].message;

    // Save user message to history
    await ChatHistory.create({
        user_id: session.user.id,
        role: "user",
        context: input.prompt
    });

    // Step 4: If LLM didn't call tools, return simple response
    if (!message.tool_calls) {
        await ChatHistory.create({
            user_id: session.user.id,
            role: "assistant",
            context: message.content
        });

        return Response.json({ result: message.content });
    }

    // Step 5: Execute tool calls
    const toolResults = await executeToolCalls(message.tool_calls, input.url);
    const imageAnalysisContext = buildImageAnalysisContext(toolResults);
   

    // Step 6: Build final LLM prompt with tool results
    const finalMessages = [
        ...contextHistory,
        { role: "user", content: userContent },
        {
            role: "assistant",
            content: message.content,
            tool_calls: message.tool_calls
        },
        ...toolResults.map(tr => ({
            role: "tool",
            tool_call_id: tr.id,
            content: tr.cleanedResult 
                ? JSON.stringify(tr.cleanedResult) 
                : JSON.stringify({ error: "Tool execution failed" })
        }))
    ];

    // Step 7: Determine if LLM should reference selected images
    const shouldReferenceImages = isAskingAboutImages(input.prompt) && 
        input.data?.selected_images?.length > 0;
    
    const selectedImagesNote = shouldReferenceImages
        ? `\n\n[NOTE: Selected reference images ${input.data.selected_images.join(", ")} are available in chat history.]`
        : "";

    // Step 8: Final LLM summary (no more tool calls) - ONLY if toolResults exist
    let finalContent = "";
    if(toolResults.length > 0) {
        const finalResponse = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [
            {
                role: "system",
                content: getFinalSummaryPrompt()
            },
            ...finalMessages,
            // Explicitly pass image analysis context as a user message
            ...(imageAnalysisContext ? [{
                role: "user",
                content: "Here is the detailed analysis of the search results:\n" + imageAnalysisContext + "\n\nNow provide your summary incorporating this analysis."
            }] : []),
            // Pass selected images note if applicable
            ...(shouldReferenceImages ? [{
                role: "user",
                content: "Summarize the result. Reference selected images if relevant." + selectedImagesNote
            }] : [])
        ] as any,
        temperature: 0.7,
        max_completion_tokens: 1000,
        tool_choice: "none"
      });
      finalContent = finalResponse.choices[0].message.content || "";
    }

    
    finalContent = stripMarkdownImages(finalContent);
    const completeResponse = finalContent + imageAnalysisContext;

    // Step 9: Store response in history
    await ChatHistory.create({
        user_id: session.user.id,
        role: "assistant",
        context: completeResponse
    });

    // Step 10: Separate and return results
    const { pexelsPhotos, generatedImages } = separateResults(toolResults, message.tool_calls);

    return Response.json({
        result: finalContent,
        data: { pexelsPhotos, generatedImages }
    });
}