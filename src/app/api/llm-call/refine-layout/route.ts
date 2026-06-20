import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runLayoutAgent } from "@/lib/agents";

const AVAILABLE_LAYOUTS = [
    {
        id: "layout-a",
        name: "Layout A",
        description: "Simple headline, body, CTA.",
        layoutType: "overlay",
        columnCount: 1,
        zones: {
            title: { x: 110, y: 120, width: 780, height: 160, align: "center", role: "hook" },
            body: { x: 110, y: 340, width: 780, height: 520, align: "left", role: "body" },
            cta: { x: 110, y: 1180, width: 780, height: 120, align: "center", role: "cta" },
        },
        roleMap: { hook: ["title"], body: ["body"], cta: ["cta"] },
        recommendedStyle: "bold",
    },
    {
        id: "layout-b",
        name: "Layout B",
        description: "Two body blocks and a centered CTA.",
        layoutType: "split",
        columnCount: 2,
        zones: {
            title: { x: 90, y: 110, width: 820, height: 150, align: "center", role: "hook" },
            left: { x: 90, y: 320, width: 360, height: 620, align: "left", role: "body" },
            right: { x: 550, y: 320, width: 360, height: 620, align: "left", role: "body" },
            cta: { x: 90, y: 1190, width: 820, height: 120, align: "center", role: "cta" },
        },
        roleMap: { hook: ["title"], body: ["left", "right"], cta: ["cta"] },
        recommendedStyle: "editorial",
    },
    {
        id: "layout-c",
        name: "Layout C",
        description: "Card-like list layout.",
        layoutType: "card_grid",
        columnCount: 1,
        zones: {
            title: { x: 95, y: 100, width: 810, height: 130, align: "center", role: "hook" },
            card1: { x: 95, y: 310, width: 810, height: 180, align: "left", role: "step" },
            card2: { x: 95, y: 520, width: 810, height: 180, align: "left", role: "step" },
            card3: { x: 95, y: 730, width: 810, height: 180, align: "left", role: "step" },
            cta: { x: 95, y: 1185, width: 810, height: 115, align: "center", role: "cta" },
        },
        roleMap: { hook: ["title"], step: ["card1", "card2", "card3"], cta: ["cta"] },
        recommendedStyle: "minimal",
    },
];

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    let topic = "";
    let prompt = "";
    try {
        const body = await request.json();
        topic = (body.topic || "").trim();
        prompt = (body.prompt || "").trim();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!topic) {
        return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    let layouts = AVAILABLE_LAYOUTS;

    // Run layout agent
    const projectId = `ephemeral_${Date.now()}`;
    const context: any = {
        userId,
        projectId,
        project: {
            projectId,
            userId,
            topic,
            contentOptions: [],
            layoutOptions: AVAILABLE_LAYOUTS.map(l => ({
                id: l.id,
                layoutName: l.name,
                layoutZones: l.zones,
                reasoning: l.description || ""
            })),
            backgroundOptions: [],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        input: { 
            topic: prompt || topic, 
            prompt: prompt || topic 
        }
    };

    try {
        const agentResult = await runLayoutAgent(context);
        if (agentResult.success && agentResult.data) {
            const selectedLayoutId = agentResult.data.id;
            layouts = [...AVAILABLE_LAYOUTS].sort((a, b) => {
                if (a.id === selectedLayoutId) return -1;
                if (b.id === selectedLayoutId) return 1;
                return 0;
            });
        } else {
            throw new Error(agentResult.error || "Layout agent failed");
        }
    } catch (e) {
        console.error("[refine-layout] agent failed:", e);
    }

    return Response.json({ success: true, layouts });
}
