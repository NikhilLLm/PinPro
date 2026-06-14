import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runContentAgent } from "@/lib/agents";
import { pexelsTool } from "@/lib/llm/tools/pexels-tool";
import Groq from "groq-sdk";

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
        console.error("[generate-content] agent failed:", error);
        // Clean fallback
        headline = `5 Tips for ${topic}`;
        bodyText = ["1. Define a clear plan", "2. Execute step-by-step", "3. Validate results", "4. Iterate quickly", "5. Refine and scale"];
        cta = "Learn more";
    }

    // 4. Find matching backgrounds from Pexels
    let backgrounds: any[] = [];
    try {
        const cleanQuery = topic
            .replace(/\s*\b(pins?|generation|ideas?|template|layout|creative|design)\b\s*/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
        const query = cleanQuery.length >= 2 ? cleanQuery : topic;
        
        console.log(`[generate-content] Searching Pexels for query: "${query}"`);
        const pexelsResult = await pexelsTool.execute({ query });
        if (pexelsResult && Array.isArray(pexelsResult.photos)) {
            backgrounds = pexelsResult.photos.slice(0, 6).map((p: any) => ({
                url: p.src.large,
                prompt: p.alt || topic
            }));
        }
    } catch (e) {
        console.error("[generate-content] Pexels search failed:", e);
    }

    if (backgrounds.length === 0) {
        backgrounds = [
            { url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80", prompt: "Coding desk" },
            { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", prompt: "Developer workspace" },
            { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80", prompt: "Code editor screen" },
            { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80", prompt: "Abstract tech light" }
        ];
    }

    // 5. Generate SEO tags using Groq
    let keywords: string[] = [];
    let hashtags: string[] = [];
    try {
        const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const seoResponse = await groqClient.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: [
                {
                    role: "system",
                    content: "You are a Pinterest SEO expert. Given a topic and a headline, suggest keywords and hashtags. Return a JSON block: {\"keywords\": [\"word1\", \"word2\", ...], \"hashtags\": [\"#hash1\", \"#hash2\", ...]} without markdown formatting tags. Output ONLY JSON."
                },
                {
                    role: "user",
                    content: `Topic: ${topic}\nHeadline: ${headline}`
                }
            ],
            temperature: 0.5,
            max_completion_tokens: 300
        });

        const seoContent = seoResponse.choices[0].message.content || "";
        const jsonMatch = seoContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0].trim());
            if (Array.isArray(parsed.keywords)) {
                keywords = parsed.keywords.map((k: string) => k.trim());
            }
            if (Array.isArray(parsed.hashtags)) {
                hashtags = parsed.hashtags.map((h: string) => h.trim());
            }
        }
    } catch (e) {
        console.error("[generate-content] SEO tag generation failed:", e);
    }

    // Fallbacks if empty or invalid
    if (keywords.length === 0) {
        keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5);
        if (!keywords.includes("pinterest")) keywords.push("pinterest");
        if (!keywords.includes("tips")) keywords.push("tips");
    }
    if (hashtags.length === 0) {
        hashtags = keywords.map(kw => `#${kw.replace(/[^a-zA-Z0-9]/g, "")}`);
    }

    return Response.json({
        success: true,
        content: {
            headline,
            body: bodyText,
            cta
        }
        // backgrounds,
        // seo: {
        //     keywords,
        //     hashtags
        // }
    });
}
