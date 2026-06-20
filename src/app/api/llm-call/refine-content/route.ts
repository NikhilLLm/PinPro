import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runContentAgent } from "@/lib/agents";

export async function POST(request: Request) {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Validate input
    let topic = "";
    try {
        const body = await request.json();
        topic = (body.topic || "").trim();
    } catch (e) {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!topic) {
        return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    // 3. Generate Copy using runContentAgent
    const projectId = `ephemeral_${Date.now()}`;
    const context: any = {
        userId,
        projectId,
        project: {
            projectId,
            userId,
            topic,
            contentOptions: [],
            layoutOptions: [],
            backgroundOptions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        input: { topic, prompt: topic }
    };

    let headline = "";
    let bodyText: string[] = [];
    let cta = "";

    try {
        const agentResult = await runContentAgent(context);
        if (agentResult.success && agentResult.data) {
            headline = agentResult.data.headline;
            bodyText = agentResult.data.steps;
            cta = agentResult.data.cta;
        } else {
            throw new Error(agentResult.error || "Content generation agent failed");
        }
    } catch (error: any) {
        console.error("[refine-content] agent failed:", error);
        // Clean fallback
        headline = `5 Tips for ${topic}`;
        bodyText = ["1. Define a clear plan", "2. Execute step-by-step", "3. Validate results", "4. Iterate quickly", "5. Refine and scale"];
        cta = "Learn more";
    }

    return Response.json({
        success: true,
        content: {
            headline,
            body: bodyText,
            cta
        }
    });
}
