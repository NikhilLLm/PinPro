import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { executeWorkflow } from "../workflow";

/**
 * POST /api/llm-call/create
 *
 * Runs the full workflow (Content → Visual → Layout agents)
 * and returns all panel data in one shot.
 *
 * Input:  { topic: string }
 * Output: {
 *   success: true,
 *   projectId: string,
 *   content:     { headline, body[], cta },
 *   layouts:     LayoutDefinition[],
 *   backgrounds: { url, prompt }[]
 * }
 */
export async function POST(request: Request) {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    console.log(session)
    if (!session || !session.user) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // 2. Validate input
    let topic = "";
    try {
        const body = await request.json();
        console.log(body);
        topic = (body.topic || "").trim();
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!topic) {
        return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    // 3. Run the full workflow
    const result = await executeWorkflow(userId, topic);
    console.log(result)

    if (!result.success || !result.project) {
        return Response.json(
            {
                success: false,
                error: result.error || "Workflow failed",
                validationErrors: result.validationErrors
            },
            { status: 500 }
        );
    }

    const project = result.project;

    // 4. Transform into frontend-friendly shape
    //    Content: agent outputs { headline, steps[], cta } → { headline, body[], cta }
    const selectedContent = project.selectedContent;
    const content = selectedContent
        ? {
              headline: selectedContent.headline,
              body: selectedContent.steps || [],
              cta: selectedContent.cta
          }
        : null;

    //    Backgrounds: agent outputs VisualOutput[] → { url, prompt }[]
    //here we have to add option for uploaded image so we can use it as background for that first we need to upload it on imagekit and then from their it's url can be used
    const backgrounds = (project.backgroundOptions || []).map((bg) => ({
        url: bg.backgroundUrl,
        prompt: bg.description || ""
    }));

    //    Layouts: agent outputs LayoutOutput[] → LayoutDefinition[]
    //    Map from agent shape to the LayoutDefinition shape the frontend LayoutSelector expects
    const layouts = (project.layoutOptions || []).map((lo) => {
        // If the layout has candidates with full zone/roleMap data, prefer that
        const zones = lo.layoutZones || {};
        return {
            id: lo.id || lo.layoutName,
            name: lo.layoutName,
            description: lo.reasoning || "",
            layoutType: "overlay" as const,
            columnCount: Object.keys(zones).length > 3 ? 2 : 1,
            zones,
            roleMap: buildRoleMap(zones),
            recommendedStyle: "bold"
        };
    });

    return Response.json({
        success: true,
        projectId: project.projectId,
        content,
        layouts,
        backgrounds
    });
}

/**
 * Build a roleMap from zones: group zone keys by their role value
 */
function buildRoleMap(zones: Record<string, any>): Record<string, string[]> {
    const roleMap: Record<string, string[]> = {};
    for (const [key, zone] of Object.entries(zones)) {
        const role = zone?.role || "body";
        if (!roleMap[role]) roleMap[role] = [];
        roleMap[role].push(key);
    }
    return roleMap;
}
