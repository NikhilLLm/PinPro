// /**
//  * WORKFLOW ORCHESTRATOR
//  * Calls agents in sequence with validate-and-retry loop
//  * Manages state handoff between stages
//  */

// import ChatSession from "@/models/ChatSession";
// import {
//     AgentContext,
//     PlannerOutput,
//     ContentOutput,
//     VisualOutput,
//     LayoutOutput,
//     GeneratorOutput
// } from "@/lib/agents";
// import {
//     runPlannerAgent,
//     runContentAgent,
//     runVisualAgent,
//     runLayoutAgent,
//     runGeneratorAgent,
//     criticizePlannerOutput,
//     criticizeContentOutput,
//     criticizeVisualOutput,
//     criticizeLayoutOutput
// } from "@/lib/agents";

// const MAX_RETRIES = 2;

// export interface WorkflowState {
//     plannerOutput?: PlannerOutput;
//     contentOutput?: ContentOutput;
//     visualOutput?: VisualOutput;
//     layoutOutput?: LayoutOutput;
//     generatorOutput?: GeneratorOutput;
//     errors: string[];
//     successStage: "planner" | "content" | "visual" | "layout" | "generator" | null;
//     resourcesReady?: boolean;
// }

// /**
//  * Main workflow orchestrator
//  * Runs agents in sequence: planner → content → visual → layout → generator
//  */
// export async function executeWorkflow(input: any, userId: string, sessionId: string, history: any[]): Promise<WorkflowState> {
//     console.log("[WORKFLOW] Starting workflow orchestration...");

//     const session = await ChatSession.findById(sessionId);
//     if (!session) {
//         throw new Error("Session not found");
//     }

//     const state = session.state || {};
//     const context: AgentContext = { userId, sessionId, state, input, history };

//     const result: WorkflowState = {
//         errors: [],
//         successStage: null
//     };

//     // ─── STAGE 1: PLANNER AGENT ────────────────────────────────────
//     console.log("[WORKFLOW] Stage 1/5: Planner Agent");
//     const plannerResult = await runAgentWithRetry(
//         "planner",
//         () => runPlannerAgent(context),
//         criticizePlannerOutput,
//         context
//     );

//     if (!plannerResult.success) {
//         result.errors.push(`Planner failed: ${plannerResult.error}`);
//         return result;
//     }

//     result.plannerOutput = plannerResult.data as PlannerOutput;
//     state.pinIdea = result.plannerOutput;
//     result.successStage = "planner";

//     // ─── STAGE 2: CONTENT AGENT ────────────────────────────────────
//     console.log("[WORKFLOW] Stage 2/5: Content Agent");
//     const contentResult = await runAgentWithRetry(
//         "content",
//         () => runContentAgent(context),
//         criticizeContentOutput,
//         context
//     );

//     if (!contentResult.success) {
//         result.errors.push(`Content failed: ${contentResult.error}`);
//         return result;
//     }

//     result.contentOutput = contentResult.data as ContentOutput;
//     state.suggestedContent = result.contentOutput;
//     result.successStage = "content";

//     // ─── STAGE 3: VISUAL AGENT ─────────────────────────────────────
//     console.log("[WORKFLOW] Stage 3/5: Visual Agent");
//     const visualResult = await runAgentWithRetry(
//         "visual",
//         () => runVisualAgent(context),
//         criticizeVisualOutput,
//         context
//     );

//     if (!visualResult.success) {
//         result.errors.push(`Visual failed: ${visualResult.error}`);
//         return result;
//     }

//     result.visualOutput = visualResult.data as VisualOutput;
//     if (result.visualOutput) {
//         state.selectedBackground = {
//             url: result.visualOutput.backgroundUrl,
//             source: result.visualOutput.backgroundSource,
//             description: result.visualOutput.description
//         };
//     }
//     result.successStage = "visual";

//     // ─── STAGE 4: LAYOUT AGENT ─────────────────────────────────────
//     console.log("[WORKFLOW] Stage 4/5: Layout Agent");
//     const layoutResult = await runAgentWithRetry(
//         "layout",
//         () => runLayoutAgent(context),
//         criticizeLayoutOutput,
//         context
//     );

//     if (!layoutResult.success) {
//         result.errors.push(`Layout failed: ${layoutResult.error}`);
//         return result;
//     }

//     result.layoutOutput = layoutResult.data as LayoutOutput;
//     if (result.layoutOutput) {
//         state.selectedLayout = {
//             id: result.layoutOutput.layoutId,
//             name: result.layoutOutput.layoutName,
//             zones: result.layoutOutput.layoutZones
//         };
//     }
//     result.successStage = "layout";

//     // ─── STAGE 5: GENERATOR AGENT ──────────────────────────────────
//     console.log("[WORKFLOW] Stage 5/5: Generator Agent");
//     state.approvedContent = input.data?.approvedContent || state.approvedContent || "";
//     state.approvedBackground = state.selectedBackground;

//     const generatorResult = await runAgentWithRetry(
//         "generator",
//         () => runGeneratorAgent(context),
//         criticizeGeneratorOutput,
//         context
//     );

//     if (!generatorResult.success) {
//         result.errors.push(`Generator failed: ${generatorResult.error}`);
//         return result;
//     }

//     result.generatorOutput = generatorResult.data as GeneratorOutput;
//     result.successStage = "generator";

//     // ─── SAVE STATE ─────────────────────────────────────────────────
//     state.validationErrors = result.errors;
//     await ChatSession.updateOne({ _id: sessionId }, { $set: { state } });

//     console.log("[WORKFLOW] Workflow completed successfully");
//     return result;
// }

// /**
//  * Run an agent with validate-and-retry loop
//  */
// async function runAgentWithRetry(
//     agentName: string,
//     agentFn: () => Promise<any>,
//     criticFn: (output: any) => any,
//     context: AgentContext,
//     retryCount: number = 0
// ): Promise<any> {
//     try {
//         const result = await agentFn();

//         if (!result.success) {
//             console.warn(`[WORKFLOW] ${agentName} failed:`, result.error);
//             return result;
//         }

//         // Validate output
//         const criticism = criticFn(result.data);
//         if (!criticism.isValid) {
//             console.warn(`[WORKFLOW] ${agentName} validation failed:`, criticism.errors);

//             if (retryCount < MAX_RETRIES) {
//                 console.log(`[WORKFLOW] Retrying ${agentName}... (attempt ${retryCount + 2})`);
//                 return runAgentWithRetry(agentName, agentFn, criticFn, context, retryCount + 1);
//             } else {
//                 return {
//                     success: false,
//                     error: `${agentName} validation failed after ${MAX_RETRIES} retries: ${criticism.errors.join("; ")}`,
//                     validationErrors: criticism.errors
//                 };
//             }
//         }

//         console.log(`[WORKFLOW] ${agentName} passed validation (score: ${criticism.score})`);
//         return result;
//     } catch (error: any) {
//         console.error(`[WORKFLOW] ${agentName} threw error:`, error.message);
//         return {
//             success: false,
//             error: `${agentName} error: ${error.message}`
//         };
//     }
// }
/**
 * WORKFLOW ORCHESTRATOR
 *
 * Creates a PinProject by running:
 * Planner → Content → Visual → Layout
 *
 * Generator is NOT part of this workflow.
 * Generation happens later via generatePins().
 */

import {
    AgentContext,
    PinProjectState,
    ContentOutput,
    VisualOutput,
    LayoutOutput
} from "@/lib/agents";

import {
    runContentAgent,
    runVisualAgent,
    runLayoutAgent,
    criticizeContentOutput,
    criticizeVisualOutput,
    criticizeLayoutOutput
} from "@/lib/agents";

const MAX_RETRIES = 2;

export interface WorkflowOutput {
    success: boolean;

    project?: PinProjectState;

    error?: string;

    validationErrors?: string[];
}

/**
 * Create project and populate all option panels
 */
export async function executeWorkflow(
    userId: string,
    topic: string
): Promise<WorkflowOutput> {
    try {
        console.log("[WORKFLOW] Starting...");

        const projectId = crypto.randomUUID();

        const project: PinProjectState = {
            projectId,
            userId,

            topic,

            contentOptions: [],
            layoutOptions: [],
            backgroundOptions: [],

            generatedPins: [],

            createdAt: new Date(),
            updatedAt: new Date()
        };

        const context: AgentContext = {
            userId,
            projectId,
            project,

            input: {
                topic,
                prompt: topic
            }
        };
        console.log(project)

        // ─────────────────────────────
        // 2. CONTENT
        // ─────────────────────────────

        const contentResult = await runAgentWithRetry(
            "content",
            () => runContentAgent(context),
            criticizeContentOutput
        );

        if (!contentResult.success) {
            return {
                success: false,
                error: contentResult.error
            };
        }

        const content = contentResult.data as ContentOutput;

        project.contentOptions = [content];

        project.selectedContent = content;

        // ─────────────────────────────
        // 3. VISUAL
        // ─────────────────────────────

        const visualResult = await runAgentWithRetry(
            "visual",
            () => runVisualAgent(context),
            criticizeVisualOutput
        );

        if (!visualResult.success) {
            return {
                success: false,
                error: visualResult.error
            };
        }

        const visual = visualResult.data as VisualOutput;

        project.backgroundOptions =
            visual.candidates?.map((candidate) => ({
                id: candidate.id,
                backgroundUrl: candidate.url,
                backgroundSource: candidate.source,
                description: candidate.prompt
            })) || [visual];

        project.selectedBackground =
            project.backgroundOptions[0];

        // ─────────────────────────────
        // 4. LAYOUT
        // ─────────────────────────────

        const layoutResult = await runAgentWithRetry(
            "layout",
            () => runLayoutAgent(context),
            criticizeLayoutOutput
        );

        if (!layoutResult.success) {
            return {
                success: false,
                error: layoutResult.error
            };
        }

        const layout = layoutResult.data as LayoutOutput;

        project.layoutOptions =
            layout.candidates?.map((candidate) => ({
                id: candidate.id,
                layoutName: candidate.name,
                layoutZones: candidate.zones,
                reasoning: candidate.description || ""
            })) || [layout];

        project.selectedLayout =
            project.layoutOptions[0];

        project.updatedAt = new Date();

        console.log("[WORKFLOW] Complete");

        return {
            success: true,
            project
        };
    } catch (error: any) {
        console.error("[WORKFLOW]", error);

        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Shared retry + critic wrapper
 */
async function runAgentWithRetry(
    agentName: string,
    agentFn: () => Promise<any>,
    criticFn: (output: any) => any,
    retryCount = 0
): Promise<any> {
    try {
        const result = await agentFn();

        if (!result.success) {
            return result;
        }

        const criticism = criticFn(result.data);

        if (!criticism.isValid) {
            console.warn(
                `[${agentName}] validation failed`,
                criticism.errors
            );

            if (retryCount < MAX_RETRIES) {
                return runAgentWithRetry(
                    agentName,
                    agentFn,
                    criticFn,
                    retryCount + 1
                );
            }

            return {
                success: false,
                error: `${agentName} validation failed`,
                validationErrors: criticism.errors
            };
        }

        console.log(
            `[${agentName}] passed (score=${criticism.score})`
        );

        return result;
    } catch (error: any) {
        return {
            success: false,
            error: error.message
        };
    }
}