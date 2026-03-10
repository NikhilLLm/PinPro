
/**
 * Layer 1: Request Classifier
 * Determines intent (chat/discovery/build), request subtype, and history depth.
 * Uses conversational context (last AI message) to handle confirmations correctly.
 */

const CLOUDFLARE_ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/`;
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

export interface ClassificationResult {
  requestType: "text" | "pexels" | "ai-image" | "layout-search" | "build-pin";
  intent: "chat" | "discovery" | "build";
  needsChatHistory: boolean;
  historyDepth: number;
}

// Stage-specific default history depths
const STAGE_HISTORY: Record<string, number> = {
  chat: 4,
  discovery: 6,
  build: 8,//this contains important history such as all the thing that are search and their result
};

export async function classifyRequest(
  userInput: string,
  hasSelectedLayout: boolean,
  hasBackground: boolean,
  hasText: boolean,
  lastAIAction: string
): Promise<ClassificationResult> {
  const systemPrompt = `You are a classifier for a Pinterest Pin Design Agent.
Classify every user message into ONE of 3 intents.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT SESSION STATE:
  lastAIAction   : "${lastAIAction}"        ← what the AI just offered/did
  hasLayout      : ${hasSelectedLayout}     ← user approved a layout visually
  hasBackground  : ${hasBackground}         ← user approved a background visually  
  hasText        : ${hasText}               ← text content exists or AI suggested it
  allApproved    : ${hasSelectedLayout && hasBackground && hasText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTENT 1 — chat
  User is thinking, asking, brainstorming. AI responds with words only.
  No tool is called. AI should end response by offering ONE next action.
  requestType: "text"

INTENT 2 — discovery  
  User wants to SEE real visual options. Always calls a tool.
  Triggers when:
    - User explicitly says "show", "find", "search", "suggest visually"
    - User says "yes/okay/sure/go ahead" AND lastAIAction suggested a visual tool
  requestType:
    "layout-search" → finding layout structures
    "pexels"        → finding real photo backgrounds
    "ai-image"      → generating custom AI background
  Important clarification about pexels and ai-image-
   -- most of time u will use pexels for searching real photo background
   if user want something different that maybe mix multiple pexels images background then use ai-image or you did not find any image while searching in pexels then request type become ai-image.

   do not hallucinate in this request type.

INTENT 3 — build
  Renders the final pin. ONLY triggers when ALL THREE are true:
    ✅ hasLayout: true
    ✅ hasBackground: true  
    ✅ hasText: true
  AND user gives explicit build command:
    "make it" / "build it" / "generate pin" / "create it now"
  If any of the three are missing → classify as chat and tell user what's still needed.
  requestType: "build-pin"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE ONLY RULE YOU NEED:

  "yes/okay/sure" → look at lastAIAction ONLY:
    "suggested_pexels"         → discovery, pexels
    "suggested_layout_search"  → discovery, layout-search
    "suggested_ai_image"       → discovery, ai-image
    "suggested_build"          → build (only if allApproved: true)
    anything else              → chat

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Output ONLY valid JSON — no extra text:
{
  "intent": "chat" | "discovery" | "build",
  "requestType": "text" | "layout-search" | "pexels" | "ai-image" | "build-pin",
  "needsChatHistory": boolean,
  "historyDepth": number,
  "reasoning": string
}`;

  try {
    const response = await fetch(`${CLOUDFLARE_ENDPOINT}${process.env.ACCOUNT_ID}/ai/run/${MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDEFARE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Classifier] API error (${response.status}):`, errorText);
      throw new Error(`Cloudflare API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("[Classifier] API response:", result);
    const content = result?.result?.response;

    if (!content) {
      console.error("[Classifier] Unexpected API response structure:", result);
      throw new Error("No response content from Cloudflare AI");
    }

    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Enforce stage-specific history depth
      parsed.historyDepth = STAGE_HISTORY[parsed.intent] ?? 4;
      console.log("[Classifier] Classification result:", parsed);
      return parsed;
    }
  } catch (e) {
    console.error("Classification failed, falling back to safe defaults:", e);
  }

  // Default Fallback — safe chat mode
  return {
    requestType: "text",
    intent: "chat",
    needsChatHistory: true,
    historyDepth: STAGE_HISTORY.chat
  };
}
