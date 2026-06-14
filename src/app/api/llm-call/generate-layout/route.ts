import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Groq from "groq-sdk";

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

    let topic = "";
    let prompt = "";
    try {
        const body = await request.json();
        topic = (body.topic || "").trim();
        prompt = (body.prompt || "").trim();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    let layouts = AVAILABLE_LAYOUTS;

    if (prompt) {
        try {
            const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
            const response = await groqClient.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: [
                    {
                        role: "system",
                        content: `You are a layout selection assistant. You will receive a layout refinement prompt and a list of layouts.
Return a sorted JSON array of layout IDs in preference order, based on the prompt. Example: ["layout-b", "layout-a", "layout-c"]. Output ONLY JSON.`
                    },
                    {
                        role: "user",
                        content: `Prompt: ${prompt}\nLayout Options: ${JSON.stringify(AVAILABLE_LAYOUTS.map(l => ({ id: l.id, name: l.name, description: l.description })))}`
                    }
                ],
                temperature: 0.3,
                max_completion_tokens: 100
            });
            const text = response.choices[0].message.content || "";
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
                const order = JSON.parse(match[0]);
                if (Array.isArray(order)) {
                    layouts = [...AVAILABLE_LAYOUTS].sort((a, b) => {
                        const idxA = order.indexOf(a.id);
                        const idxB = order.indexOf(b.id);
                        if (idxA === -1 && idxB === -1) return 0;
                        if (idxA === -1) return 1;
                        if (idxB === -1) return -1;
                        return idxA - idxB;
                    });
                }
            }
        } catch (e) {
            console.error("Layout sorting failed:", e);
        }
    }

    return Response.json({ success: true, layouts });
}
