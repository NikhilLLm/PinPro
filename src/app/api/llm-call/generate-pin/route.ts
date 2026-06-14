import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import ImageKit from "imagekit";
import { buildPinWithSharp } from "@/lib/sharp-pin-builder";
import { LLMPinJSON } from "@/types/llm-json";

const imagekit = new ImageKit({
    publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY!,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_URL_ENDPOINT!,
});

const VARIANT_STYLES = [
    { id: "v1", name: "Bold Preset", style: "bold" as const },
    { id: "v2", name: "Editorial Preset", style: "editorial" as const },
    { id: "v3", name: "Minimal Preset", style: "minimal" as const },
];

async function uploadToImageKit(file: string): Promise<string | null> {
    try {
        const res = await imagekit.upload({
            file,
            fileName: `pin_${Date.now()}.png`,
            folder: "/ai-pins",
            useUniqueFileName: true,
        });
        return res?.url || null;
    } catch (e: any) {
        console.error("[generate-pin] ImageKit upload error:", e.message);
        return null;
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { topic, content, layout, background } = body;

    if (!content?.headline || !layout?.zones || !background?.url) {
        return Response.json(
            { error: "Missing required fields: content.headline, layout.zones, background.url" },
            { status: 400 }
        );
    }

    // Build text layers from user-edited content
    const layers: any[] = [];
    layers.push({ role: "hook", text: content.headline, colorOverride: "#ffffff", sizeOverride: 52 });

    if (Array.isArray(content.body)) {
        content.body.forEach((line: string) => {
            layers.push({ role: "body", text: line, colorOverride: "#e2e8f0", sizeOverride: 28 });
        });
    }

    if (content.cta) {
        layers.push({ role: "cta", text: content.cta, colorOverride: "#fbbf24", sizeOverride: 26 });
    }

    // Generate 3 variants with different style presets
    const variants: { id: string; name: string; url: string }[] = [];

    for (const variant of VARIANT_STYLES) {
        try {
            const pinConfig: LLMPinJSON = {
                baseImageUrl: background.url,
                style: variant.style,
                layers,
                layout,
            };

            console.log(`[generate-pin] Rendering variant: ${variant.name}`);
            const buffer = await buildPinWithSharp(pinConfig);
            const base64 = `data:image/png;base64,${buffer.toString("base64")}`;
            const uploadedUrl = await uploadToImageKit(base64);

            if (uploadedUrl) {
                variants.push({ id: variant.id, name: variant.name, url: uploadedUrl });
            } else {
                console.warn(`[generate-pin] Upload failed for ${variant.name}, using base64 fallback`);
                variants.push({ id: variant.id, name: variant.name, url: base64 });
            }
        } catch (err: any) {
            console.error(`[generate-pin] Variant ${variant.name} failed:`, err.message);
        }
    }

    if (variants.length === 0) {
        return Response.json({ error: "All pin variants failed to render" }, { status: 500 });
    }

    // Call SEO agent
    let seo = null;
    try {
        const { runSEOAgent } = require("@/lib/agents/seoagent");
        seo = await runSEOAgent({
            topic: topic || content.headline,
            headline: content.headline,
            body: content.body,
            cta: content.cta
        });
    } catch (err: any) {
        console.error("[generate-pin] SEO generation failed:", err.message);
    }

    return Response.json({ success: true, variants, seo });
}
