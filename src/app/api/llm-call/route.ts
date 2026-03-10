
import Groq from "groq-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import ChatHistory from "@/models/ChatHistory";
import LayoutTemplate from "@/models/LayoutTemplate";

// ─── MODULAR IMPORTS ──────────────────────────────────────────────────
import { analyzeReferenceImage, analyzeSelectedStyles, extractLayoutDefinition } from "./vision";
import { formatTools, buildImageAnalysisContext, separateResults } from "./toolExecutor";
import { classifyRequest } from "./classifiers";
import { validateResponse } from "./validation";
import {
    getChatPrompt,
    getDiscoveryPrompt,
    getGenerationPrompt,
    getIkEndpoint,
    cleanContextHistory,
    buildUserMessage,
    stripMarkdownImages
} from "./prompts";
import { executeToolCalls } from "./execute";

const Groq_api = process.env.GROQ_API_KEY;
const client = new Groq({ apiKey: Groq_api });

// Helper for adding delays between AI calls
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// ─── MAIN API HANDLER ────────────────────────────────────────────────
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { input, history = [] } = await request.json();
    await connectToDatabase();

    // ─── STEP 1: INTENT CLASSIFICATION ───────────────────────────────
    const hasSelectedLayout = !!input.data?.selectedLayout;
    const hasBackground = input.data?.hasBackground ?? !!input.data?.approvedBackground?.url;
    const hasText = input.data?.hasText ?? (!!input.prompt && input.prompt.length > 10);

    // Extract last action for conversational context
    const lastMsg = [...history].reverse().find((m: any) => m.role === "assistant")?.content || "";
    let lastAIAction = "none";
    const lowerMsg = lastMsg.toLowerCase();
    if (lowerMsg.includes("pexels") || lowerMsg.includes("image")) lastAIAction = "suggested_pexels";
    if (lowerMsg.includes("layout") || lowerMsg.includes("template")) lastAIAction = "suggested_layout_search";
    if (lowerMsg.includes("generate") || lowerMsg.includes("custom image")) lastAIAction = "suggested_ai_image";
    if (lowerMsg.includes("build") || lowerMsg.includes("ready") || lowerMsg.includes("finalize")) lastAIAction = "suggested_build";

    const { requestType, intent, historyDepth } = await classifyRequest(
        input.prompt,
        hasSelectedLayout,
        hasBackground,
        hasText,
        lastAIAction
    );
    console.log(`[Classifier] Intent: ${intent}, Type: ${requestType}, Depth: ${historyDepth}`);

    await sleep(1000);

    // ─── STEP 2: CONTEXT PREPARATION ─────────────────────────────────
    const contextHistory = cleanContextHistory(history, historyDepth);

    // Initial response data container (persists existing assets)
    let responseData: any = {
        layouts: input.data?.layouts || [],
        pexelsPhotos: input.data?.pexelsPhotos || [],
        generatedImages: input.data?.generatedImages || [],
        selectedLayout: input.data?.selectedLayout || null,
        pinUrl: null
    };

    let imageDescription = "";
    if (input.data?.url) {
        const description = await analyzeReferenceImage(input.data.url);
        imageDescription = description ? `The attached image contains: ${description}` : "";
    }

    let pexelsSelectedImageDescription = "";
    if (input.data?.selected_images && input.data.selected_images.length > 0) {
        const pexelsImgDescription = await analyzeSelectedStyles(input.data.selected_images);
        if (pexelsImgDescription) pexelsSelectedImageDescription = pexelsImgDescription;
    }

    // Asset Memory
    const recentHistoryWithAssets = await ChatHistory.find({
        user_id: session.user.id,
        "assets.0": { $exists: true }
    }).sort({ createdAt: -1 }).limit(historyDepth);

    const availableAssets = recentHistoryWithAssets.flatMap(h => h.assets || []);
    let assetContext = "";
    if (availableAssets.length > 0) {
        assetContext = `\n\n[AVAILABLE_ASSETS]:\n${availableAssets.map(a => `- URL: ${a.url}\n  Description: ${a.description}`).join('\n')}`;
    }

    const userContent = buildUserMessage(
        input.prompt,
        imageDescription,
        pexelsSelectedImageDescription,
        !!input.url,
        input.data?.selected_images
    ) + assetContext;

    // ─── STEP 3: READINESS GATE ──────────────────────────────────────
    const readiness = {
        layout: hasSelectedLayout,
        background: !!(
            (input.data?.selected_images && input.data.selected_images.length > 0) ||
            input.data?.approvedBackground?.url ||
            input.data?.url
        ),
    };
    const isReadyToBuild = readiness.layout && readiness.background;
    console.log(`[Readiness] Layout: ${readiness.layout}, Background: ${readiness.background}, Ready: ${isReadyToBuild}`);

    // ─── STEP 4: INITIAL LLM CALL (PHASE-DRIVEN) ────────────────────
    const formattedTools = formatTools();
    let activeSystemPrompt = getChatPrompt();
    let useTools = false;

    if (isReadyToBuild && intent === "build") {
        // Phase 3: Build — all requirements met
        console.log(`[ORCHESTRATOR] Phase 3 (Build) — Layout: ${input.data.selectedLayout.name}`);
        const roles = Object.keys(input.data.selectedLayout.roleMap || {});
        console.log(`[ORCHESTRATOR] Required roles: ${roles.join(", ")}`);
        activeSystemPrompt = getGenerationPrompt(input.data.selectedLayout);
        useTools = false;
    } else if (intent === "discovery") {
        // Phase 2: Discovery — tool-enabled research
        console.log(`[ORCHESTRATOR] Phase 2 (Discovery) — Type: ${requestType}`);

        // If layout is already selected, Discovery should focus ONLY on backgrounds
        if (hasSelectedLayout) {
            activeSystemPrompt = getDiscoveryPrompt() + "\n[SYSTEM_NOTE]: Layout is ALREADY selected. Focus ONLY on finding a matching background image now.";
        } else {
            activeSystemPrompt = getDiscoveryPrompt();
        }
        useTools = true;
    } else {
        // Phase 1: Chat — no tools
        console.log(`[ORCHESTRATOR] Phase 1 (Chat)`);
    }

    let initialResponse;
    try {
        initialResponse = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                { role: "system", content: activeSystemPrompt },
                ...contextHistory,
                { role: "user", content: userContent }
            ],
            ...(useTools ? { tools: formattedTools, tool_choice: "auto" as const } : {})
        });
    } catch (error: any) {
        // Handle Issue 1 & 3: Model-level tool_use_failed error (400)
        if (error?.status === 400 && error?.error?.code === "tool_use_failed") {
            console.warn("[ORCHESTRATOR] Model attempted tool call without tools. Retrying with explicit block...");
            initialResponse = await client.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: activeSystemPrompt },
                    ...contextHistory,
                    { role: "user", content: userContent }
                ],
                // Explicitly tell the API we want NO tools to block the model's hallucinated calls
                tools: [],
                tool_choice: "none" as const
            });
        } else {
            console.error("[ORCHESTRATOR] Initial LLM call failed:", error);
            throw error; // Re-throw other errors
        }
    }

    const initialMessage = initialResponse.choices[0].message;

    // ─── STEP 5: PERSIST USER REQUEST ────────────────────────────────
    await ChatHistory.create({
        user_id: session.user.id,
        role: "user",
        context: input.prompt
    });

    // ─── STEP 6: CHAT FAST TRACK ────────────────────────────────────
    if (!initialMessage.tool_calls) {
        // Light validation for chat — catch hallucination
        const historyStr = contextHistory.map(m => `${m.role}: ${m.content}`).join('\n');
        const validation = await validateResponse(input.prompt, historyStr, initialMessage.content || "", requestType);
        if (!validation.isValid) {
            console.warn(`[Chat Validation] Flag: ${validation.feedback}`);
        }

        await ChatHistory.create({
            user_id: session.user.id,
            role: "assistant",
            context: initialMessage.content
        });
        return Response.json({ result: initialMessage.content, data: responseData });
    }

    // ─── STEP 7: TOOL EXECUTION (DISCOVERY ONLY) ─────────────────────
    const toolResults = await executeToolCalls(
        initialMessage.tool_calls,
        input.data?.url,
        input.data?.selected_images
    );
    const imageAnalysisContext = buildImageAnalysisContext(toolResults);
    const { pexelsPhotos, generatedImages } = separateResults(toolResults, initialMessage.tool_calls);

    // Accumulate results
    responseData.pexelsPhotos = [...pexelsPhotos, ...responseData.pexelsPhotos].slice(0, 15);
    responseData.generatedImages = [...generatedImages, ...responseData.generatedImages].slice(0, 10);

    // ─── STEP 7.1: Layout Extraction from Web Search ─────────────────
    let trendingLayoutsContext = "";
    const searchResult = toolResults.find(tr => {
        const toolCall = initialMessage.tool_calls?.find(tc => tc.id === tr.id);
        return toolCall?.function.name === "web_search_tool";
    });

    if (searchResult?.cleanedResult?.images?.length > 0) {
        console.log(`[Discovery] Analyzing ${searchResult.cleanedResult.images.length} layout images...`);
        const layoutAnalyses = await Promise.all(
            searchResult.cleanedResult.images.slice(0, 3).map((url: string) => extractLayoutDefinition(url))
        );

        const validLayouts = layoutAnalyses.filter(l => l && l.zones);

        if (validLayouts.length > 0) {
            // Return layouts for user selection — PAUSE here
            if (!input.data?.selectedLayout) {
                console.log(`[Discovery] Returning ${validLayouts.length} layouts for approval.`);

                // Persist templates to database
                try {
                    await Promise.all(validLayouts.map(l =>
                        LayoutTemplate.findOneAndUpdate(
                            { source_url: l.source_url || l.name },
                            { ...l, discovered: true },
                            { upsert: true, new: true }
                        )
                    ));
                    console.log(`[Discovery] Persisted ${validLayouts.length} templates.`);
                } catch (err) {
                    console.error("Failed to persist templates:", err);
                }

                await ChatHistory.create({
                    user_id: session.user.id,
                    role: "assistant",
                    context: "Discovered trending layouts for approval."
                });

                responseData.layouts = validLayouts; // Update with new findings
                return Response.json({
                    result: "I've discovered some trending layouts that would work great for your Pin! Here are the best options:",
                    data: responseData
                });
            }

            trendingLayoutsContext = "\n\n[TRENDING LAYOUT ANALYSES]:\n" +
                validLayouts.map((l, i) => `Option ${i + 1}: ${l.name} (${l.layoutType}) - ${l.description}. Columns: ${l.columnCount}. Style: ${l.recommendedStyle}.`).join("\n");
        } else {
            // Discovery validation: layout extraction failed
            console.warn("[Discovery Validation] FAIL: No valid layouts extracted from search results.");
            await ChatHistory.create({
                user_id: session.user.id,
                role: "assistant",
                context: "I searched for layouts but couldn't extract usable designs. Let me try a different search."
            });
            return Response.json({
                result: "I searched for trending layouts but couldn't extract clean designs from the results. Could you describe the style you're looking for so I can try a more targeted search?",
                data: responseData
            });
        }
    }

    // ─── STEP 7.2: Discovery Result (non-layout tools) ───────────────
    // For pexels/ai-image discovery, return results immediately
    if (intent === "discovery" && !isReadyToBuild) {
        const discoveryResponse = initialMessage.content || "Here's what I found:";

        // Discovery validation: check results aren't empty
        if (pexelsPhotos.length === 0 && generatedImages.length === 0 && !searchResult) {
            console.warn("[Discovery Validation] FAIL: No results from tools.");
        }

        await ChatHistory.create({
            user_id: session.user.id,
            role: "assistant",
            context: discoveryResponse
        });

        return Response.json({
            result: discoveryResponse,
            data: responseData
        });
    }

    // ─── STEP 8: BUILD VALIDATION LOOP (STRICT) ──────────────────────
    let selectedLayoutContext = "";
    if (input.data?.selectedLayout) {
        console.log(`[Build] Using Blueprint: ${input.data.selectedLayout.name}`);
        selectedLayoutContext = `\n\n[SELECTED_LAYOUT_BLUEPRINT]:\n${JSON.stringify(input.data.selectedLayout)}`;
    }

    let finalContent = "";
    let pinUrl: string | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    let validationFeedback: string | null = null;

    while (retryCount <= MAX_RETRIES) {
        const finalMessages = [
            ...contextHistory,
            { role: "user", content: userContent + imageAnalysisContext + trendingLayoutsContext + selectedLayoutContext },
            { role: "assistant", content: initialMessage.content || "I'll look into that.", tool_calls: initialMessage.tool_calls },
            ...toolResults.map(tr => ({
                role: "tool",
                tool_call_id: tr.id,
                content: JSON.stringify(tr.cleanedResult || { error: "Failed" })
            }))
        ];

        if (validationFeedback) {
            finalMessages.push({
                role: "system",
                content: `[VALIDATION FAILED - CRITICAL CORRECTION REQUIRED]:\n${validationFeedback}\n\nYou MUST fix these specific values in your next <pin_json> block.`
            });
        }

        const finalResponse = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                { role: "system", content: getGenerationPrompt(input.data?.selectedLayout) },
                ...finalMessages,
                ...(imageAnalysisContext ? [{
                    role: "user",
                    content: `System Status:\n${imageAnalysisContext}${generatedImages.length > 0 ? "\n[STATE: BACKGROUND_LOADED_AND_READY]. Output <pin_json> now." : ""}`
                }] : [])
            ] as any,
            temperature: 0.7,
            max_completion_tokens: 1500
        });

        finalContent = finalResponse.choices[0].message.content || "";

        await sleep(1000);

        // Strict validation for build
        const historyStr = contextHistory.map(m => `${m.role}: ${m.content}`).join('\n');
        const validation = await validateResponse(input.prompt, historyStr, finalContent, "build-pin");

        if (validation.isValid) {
            console.log("[Build Validation] PASS");
            break;
        } else {
            console.warn(`[Build Validation] FAIL (Retry ${retryCount + 1}):`, validation.feedback);
            validationFeedback = validation.feedback;
            retryCount++;
        }
    }

    // ─── STEP 9: PIN RENDERING (SHARP ENGINE) ─────────────────────────
    const pinJsonSplit = finalContent.match(/<pin_json>([\s\S]*?)<\/pin_json>/);
    if (pinJsonSplit) {
        try {
            const pinConfig = JSON.parse(pinJsonSplit[1].trim());
            finalContent = finalContent.replace(/<pin_json>[\s\S]*?<\/pin_json>/, "").trim();

            const { uploadToImageKit } = await import('@/lib/imagekit-utils');
            const { buildPinWithSharp } = await import('@/lib/sharp-pin-builder');

            let bgUrl = input.data?.approvedBackground?.url || pinConfig.baseImageUrl;
            if (bgUrl === "[GENERATED_IMAGE]" || !bgUrl) {
                if (generatedImages.length > 0) {
                    const img = generatedImages[0];
                    bgUrl = img.url.startsWith("data:image") ? await uploadToImageKit(img.url) : img.url;
                }
            } else if (bgUrl.startsWith("data:image")) {
                bgUrl = await uploadToImageKit(bgUrl);
            }

            if (bgUrl && pinConfig.layers) {
                pinConfig.baseImageUrl = bgUrl;
                if (input.data?.selectedLayout) {
                    pinConfig.layout = input.data.selectedLayout;
                }
                const finalBuffer = await buildPinWithSharp(pinConfig);
                const finalBase64 = `data:image/png;base64,${finalBuffer.toString('base64')}`;
                pinUrl = await uploadToImageKit(finalBase64);
                console.log("Sharp-built Pin Uploaded:", pinUrl);
            }
        } catch (e) {
            console.error("Layout engine error:", e);
        }
    }

    // ─── STEP 10: CLEANUP & PERSISTENCE ──────────────────────────────
    finalContent = stripMarkdownImages(finalContent);
    const completeResponse = finalContent || "I've designed the perfect Pin for you! Have a look at the layout on the right.";

    const finalAssets = generatedImages.map(img => ({
        url: img.url,
        description: img.prompt
    })).filter(a => a.url && a.url.startsWith('http'));

    await ChatHistory.create({
        user_id: session.user.id,
        role: "assistant",
        context: completeResponse,
        assets: finalAssets.length > 0 ? finalAssets : undefined
    });

    responseData.pinUrl = pinUrl;
    return Response.json({
        result: completeResponse,
        data: responseData
    });
}