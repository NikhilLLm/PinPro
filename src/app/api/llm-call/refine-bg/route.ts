import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runVisualAgent } from "@/lib/agents";

export async function POST(request: Request) {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Validate input
    let topic = "";
    let prompt = "";
    try {
        const body = await request.json();
        console.log("BODY BG",body);
        topic = (body.topic || "").trim();
        prompt = (body.prompt || "").trim();
    } catch (e) {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    console.log("this is topic",topic)
    if (!topic) {
        return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    // 3. Generate background options using runVisualAgent
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
        input: { 
            topic: prompt || topic, 
            prompt: prompt || topic 
        }
    };

    let backgrounds: any[] = [];
    try {
        const agentResult = await runVisualAgent(context);
        if (agentResult.success && agentResult.data) {
            const candidates = agentResult.data.candidates || [];
            backgrounds = candidates.map((c: any) => ({
                url: c.url,
                prompt: c.prompt
            }));

            if (backgrounds.length === 0 && agentResult.data.backgroundUrl) {
                backgrounds = [{
                    url: agentResult.data.backgroundUrl,
                    prompt: agentResult.data.description || prompt || topic
                }];
            }
        } else {
            throw new Error(agentResult.error || "Visual agent failed");
        }
    } catch (error: any) {
        console.error("[refine-bg] agent failed:", error);
    }

    if (backgrounds.length === 0) {
        backgrounds = [
            { url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80", prompt: "Coding desk" },
            { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", prompt: "Developer workspace" },
            { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80", prompt: "Code editor screen" },
            { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80", prompt: "Abstract tech light" }
        ];
    }

    return Response.json({
        success: true,
        backgrounds
    });
}
