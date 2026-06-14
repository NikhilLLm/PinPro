import { PinProjectState, runGeneratorAgent } from "@/lib/agents";
import { runSEOAgent } from "@/lib/agents/seoagent";

export async function generatePins(
    project: PinProjectState
) {
    const generatorContext = {
        userId: project.userId,
        projectId: project.projectId,
        project,
        input: {
            selectedContent: project.selectedContent,
            selectedLayout: project.selectedLayout,
            selectedBackground: project.selectedBackground,
            runGenerator: true
        }
    };

    const pinResult =
        await runGeneratorAgent(generatorContext);

    if (!pinResult.success) {
        throw new Error(pinResult.error);
    }

    const seo =
        await runSEOAgent({
            topic: project.topic,
            headline: project.selectedContent?.headline || project.topic,
            body: project.selectedContent?.steps || [],
            cta: project.selectedContent?.cta
        });

    project.generatedPins = [
        pinResult.data!
    ];

    project.seo = seo;

    return {
        generatedPins: project.generatedPins,
        seo
    };
}