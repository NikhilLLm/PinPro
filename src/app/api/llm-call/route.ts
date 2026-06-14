/**
 * Legacy chat endpoint — disabled.
 * Use the panel endpoints instead:
 *   /api/llm-call/generate-content
 *   /api/llm-call/generate-bg
 *   /api/llm-call/generate-layout
 *   /api/llm-call/generate-pin
 */
export async function POST() {
    return Response.json(
        { error: "Chat is disabled. Use the panel endpoints: generate-content, generate-bg, generate-layout, generate-pin." },
        { status: 404 }
    );
}