/**
 * SEO AGENT
 * Generates Pinterest SEO metadata using LLM:
 *   - Pin title
 *   - Pin description
 *   - Hashtags
 *   - Keywords
 *
 * Accepts either AgentContext or a simple { topic, content } object.
 */

import Groq from "groq-sdk";
import { SEOOutput } from "./types";

const client = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

interface SEOInput {
    topic: string;
    headline: string;
    body?: string[];
    cta?: string;
}

/**
 * Run the SEO agent — works with any shape that has topic + content
 */
export async function runSEOAgent(
    input: SEOInput
): Promise<SEOOutput> {
    const { topic, headline, body, cta } = input;

    try {
        console.log("[SEO] Generating SEO via LLM...");

        const response = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",

            messages: [
                {
                    role: "system",
                    content: `You are a Pinterest SEO expert. Given a topic, headline, and body content, generate optimized Pinterest SEO metadata.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "title": "Optimized pin title (max 100 chars, keyword-rich)",
  "description": "Compelling pin description (150-300 chars, includes keywords naturally)",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "hashtags": ["#Hashtag1", "#Hashtag2", "#Hashtag3", "#Hashtag4", "#Hashtag5"]
}

Rules:
- Title should be catchy and include the main keyword
- Description should be compelling and include 2-3 keywords naturally
- Keywords: 5-10 relevant Pinterest search terms
- Hashtags: 5-8 trending Pinterest hashtags with # prefix
- Focus on discoverability and click-through rate`
                },
                {
                    role: "user",
                    content: `Topic: ${topic}
Headline: ${headline}
Body: ${(body || []).join(" | ")}
CTA: ${cta || ""}`
                }
            ],

            temperature: 0.5,
            max_completion_tokens: 400
        });

        const llmContent = response.choices?.[0]?.message?.content || "";

        // Extract JSON from response
        const jsonMatch = llmContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0].trim());

            return {
                title: parsed.title || headline.substring(0, 100),
                description: parsed.description || buildFallbackDescription(headline, body, cta),
                keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map((k: string) => k.trim()) : extractFallbackKeywords(topic, headline),
                hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map((h: string) => h.trim()) : []
            };
        }

        console.warn("[SEO] LLM returned non-JSON, using fallback");
    } catch (error: any) {
        console.error("[SEO] LLM call failed:", error.message);
    }

    // Fallback: deterministic SEO
    return buildFallbackSEO(topic, headline, body, cta);
}

// ─────────────────────────────────────────────
// FALLBACK HELPERS
// ─────────────────────────────────────────────

function buildFallbackSEO(
    topic: string,
    headline: string,
    body?: string[],
    cta?: string
): SEOOutput {
    const keywords = extractFallbackKeywords(topic, headline);
    const hashtags = keywords.slice(0, 8).map(toHashtag);

    return {
        title: headline.substring(0, 100),
        description: buildFallbackDescription(headline, body, cta),
        keywords,
        hashtags
    };
}

function buildFallbackDescription(
    headline: string,
    body?: string[],
    cta?: string
): string {
    const steps = body?.join(", ") || "";
    return `${headline}. ${steps}. ${cta || ""}`.trim();
}

function extractFallbackKeywords(
    topic: string,
    headline: string
): string[] {
    const text = [topic, headline].join(" ").toLowerCase();

    const words = text
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3);

    const stopWords = new Set([
        "this", "that", "with", "from", "your", "have",
        "will", "should", "every", "about", "into", "using", "learn"
    ]);

    const frequency = new Map<string, number>();
    for (const word of words) {
        if (stopWords.has(word)) continue;
        frequency.set(word, (frequency.get(word) || 0) + 1);
    }

    return [...frequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

function toHashtag(keyword: string): string {
    return (
        "#" +
        keyword
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join("")
    );
}