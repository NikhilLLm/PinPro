import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generatePins } from "../generatePin";

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

    console.log("[generate-pin] Incoming body:", body);

    const { projectId, topic, content, layout, background } = body;

    // Basic validation
    if (!content?.headline || !layout?.zones || !background?.url) {
        return Response.json(
            { error: "Missing required fields: content.headline, layout.zones, background.url" },
            { status: 400 }
        );
    }

    try {
        const result = await generatePins(
            { projectId, topic, content, layout, background },
            (session.user as any).id || session.user.email || "anonymous"
        );

        if (!result.success) {
            return Response.json(
                { error: result.error || "Pin generation failed" },
                { status: 500 }
            );
        }

        console.log("[generate-pin] Variants:", result.variants.length);

        return Response.json({
            success: true,
            variants: result.variants,
            seo: result.seo
        });
    } catch (err: any) {
        console.error("[generate-pin] Unexpected error:", err.message);
        return Response.json(
            { error: "Internal server error: " + err.message },
            { status: 500 }
        );
    }
}
