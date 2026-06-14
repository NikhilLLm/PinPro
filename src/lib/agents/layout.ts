// /**
//  * LAYOUT AGENT
//  * Selects and validates a layout based on pin idea
//  * Input: PinIdeaOutput + available layouts
//  * Output: LayoutOutput with selected layout ID + zones
//  */

// import { AgentContext, AgentResult, LayoutOutput } from "./types";
// import { executeToolCalls } from "@/app/api/llm-call/execute";
// // Fallback minimal layout
// const UNIVERSAL_MINIMAL_LAYOUT = {
//     name: "Minimalist Center",
//     layoutType: "overlay",
//     columnCount: 1,
//     zones: {
//         center: { x: 100, y: 600, width: 800, height: 300, align: "center", role: "center" }
//     },
//     roleMap: {
//         center: ["center"]
//     },
//     recommendedStyle: "minimalist",
//     content_tags: ["quote", "minimal"]
// };

// export async function runLayoutAgent(
//     context: AgentContext
// ): Promise<AgentResult<LayoutOutput>> {
//     const { state, input } = context;

//     console.log("[LAYOUT] Running layout agent...");

//     // If layout already selected, use it
//     if (input.selectedLayout || state.selectedLayout) {
//         const layout = input.selectedLayout || state.selectedLayout;
//         if (layout && layout.zones) {
//             console.log("[LAYOUT] Using existing selected layout:", layout.name);
//             return {
//                 success: true,
//                 data: {
//                     layoutId: layout.id || layout.name,
//                     layoutName: layout.name,
//                     layoutZones: layout.zones,
//                     reasoning: "Layout already selected by user",
//                     candidates: [toLayoutCandidate(layout)]
//                 }
//             };
//         }
//     }

//     const topic = state.pinIdea?.topic || input.topic || input.prompt || state.goal || "";
//     let trendHint = "";
//     try {
//         const discoveryToolCall = {
//             id: "layout-discovery-1",
//             function: {
//                 name: "web_search_tool",
//                 arguments: JSON.stringify({
//                     query: `${topic} pinterest layout examples`,
//                     max_results: 5,
//                     include_images: true,
//                     include_answer: true
//                 })
//             }
//         };
//         const discoveryResults = await executeToolCalls([discoveryToolCall]);
//         const discovery = discoveryResults[0];
//         if (!discovery?.error && discovery?.cleanedResult?.answer) {
//             trendHint = discovery.cleanedResult.answer;
//         }
//     } catch (error) {
//         console.warn("[LAYOUT] Trend discovery failed, continuing with deterministic fallback.");
//     }

//     // If available layouts provided, pick best match
//     const availableLayouts = dedupeLayouts([
//         ...(input.layouts || []),
//         ...((state.layoutCandidates || []) as any[])
//     ]);
//     if (availableLayouts.length > 0) {
//         const selected = selectBestLayout(availableLayouts, state.pinIdea, trendHint);
//         if (selected) {
//             console.log("[LAYOUT] Selected layout:", selected.name);
//             return {
//                 success: true,
//                 data: {
//                     layoutId: selected.id || selected.name,
//                     layoutName: selected.name,
//                     layoutZones: selected.zones,
//                     reasoning: `Matched layout \"${selected.name}\" to pin idea${trendHint ? " with trend signal" : ""}`,
//                     candidates: availableLayouts.slice(0, 6).map(toLayoutCandidate)
//                 }
//             };
//         }
//     }

//     // Fall back to universal minimal layout
//     console.log("[LAYOUT] No layouts available. Using fallback minimal layout.");
//     return {
//         success: true,
//         data: {
//             layoutId: "minimal",
//             layoutName: UNIVERSAL_MINIMAL_LAYOUT.name,
//             layoutZones: UNIVERSAL_MINIMAL_LAYOUT.zones,
//             reasoning: "No layouts provided; using fallback minimalist layout",
//             candidates: [toLayoutCandidate(UNIVERSAL_MINIMAL_LAYOUT)]
//         }
//     };
// }

// /**
//  * Select best layout based on pin idea
//  * Simple heuristic: for "developer" topics, prefer multi-column layouts
//  */
// function selectBestLayout(layouts: any[], pinIdea: any, trendHint: string = ""): any {
//     if (!layouts || layouts.length === 0) return null;

//     const audience = pinIdea?.audience || "";
//     const topic = pinIdea?.topic || "";
//     const trend = trendHint.toLowerCase();

//     // If topic mentions "steps" or "list", prefer multi-zone layouts
//     const needsMultiZone = /steps|list|ways|reasons|points|tips/i.test(topic);
//     const prefersEditorial = /editorial|magazine|story/i.test(trend);
//     const prefersMinimal = /minimal|clean|simple/i.test(trend);

//     // Sort layouts by zone count + trend/style hints
//     const sorted = [...layouts].sort((a, b) => {
//         const aZoneCount = Object.keys(a.zones || {}).length;
//         const bZoneCount = Object.keys(b.zones || {}).length;
//         const aStyle = String(a.recommendedStyle || "").toLowerCase();
//         const bStyle = String(b.recommendedStyle || "").toLowerCase();
//         const aEditorialBoost = prefersEditorial && (aStyle.includes("editorial") || String(a.layoutType || "").includes("magazine")) ? 2 : 0;
//         const bEditorialBoost = prefersEditorial && (bStyle.includes("editorial") || String(b.layoutType || "").includes("magazine")) ? 2 : 0;
//         const aMinimalBoost = prefersMinimal && aStyle.includes("minimal") ? 1 : 0;
//         const bMinimalBoost = prefersMinimal && bStyle.includes("minimal") ? 1 : 0;
//         const boostDelta = (bEditorialBoost + bMinimalBoost) - (aEditorialBoost + aMinimalBoost);
//         if (boostDelta !== 0) return boostDelta;

//         if (needsMultiZone) {
//             return bZoneCount - aZoneCount; // prefer more zones
//         } else {
//             return aZoneCount - bZoneCount; // prefer fewer zones
//         }
//     });

//     return sorted[0] || null;
// }

// function toLayoutCandidate(layout: any) {
//     return {
//         id: layout.id || layout.name || "layout",
//         name: layout.name || "Layout",
//         layoutType: layout.layoutType,
//         columnCount: layout.columnCount,
//         zones: layout.zones || {},
//         roleMap: layout.roleMap || {},
//         recommendedStyle: layout.recommendedStyle,
//         description: layout.description || ""
//     };
// }

// function dedupeLayouts(layouts: any[]): any[] {
//     const seen = new Set<string>();
//     const deduped: any[] = [];
//     for (const layout of layouts) {
//         if (!layout || !layout.zones) continue;
//         const key = String(layout.id || layout.name || JSON.stringify(layout.zones));
//         if (seen.has(key)) continue;
//         seen.add(key);
//         deduped.push(layout);
//     }
//     return deduped;
// }


/**
 * LAYOUT AGENT
 * Selects and validates a layout based on project state
 * Compatible with PinProject architecture
 */

import {
    AgentContext,
    AgentResult,
    LayoutOutput
} from "./types";

import { executeToolCalls } from "@/app/api/llm-call/execute";

// ─────────────────────────────────────────────
// FALLBACK LAYOUT
// ─────────────────────────────────────────────

const UNIVERSAL_MINIMAL_LAYOUT = {
    id: "minimal",
    name: "Minimalist Center",
    layoutType: "overlay",
    columnCount: 1,

    zones: {
        center: {
            x: 100,
            y: 600,
            width: 800,
            height: 300,
            align: "center",
            role: "center"
        }
    },

    roleMap: {
        center: ["center"]
    },

    recommendedStyle: "minimalist",

    content_tags: ["quote", "minimal"]
};

// ─────────────────────────────────────────────
// MAIN AGENT
// ─────────────────────────────────────────────

export async function runLayoutAgent(
    context: AgentContext
): Promise<AgentResult<LayoutOutput>> {
    const { project, input } = context;

    console.log("[LAYOUT] Running layout agent...");

    // ─────────────────────────────────────────
    // Use existing selected layout
    // ─────────────────────────────────────────

    if (
        input.selectedLayout ||
        project.selectedLayout
    ) {
        const layout =
            input.selectedLayout ||
            project.selectedLayout;

        if (layout?.layoutZones) {
            console.log(
                "[LAYOUT] Using existing selected layout"
            );

            return {
                success: true,

                data: {
                    id:
                        layout.id ||
                        crypto.randomUUID(),

                    layoutName:
                        layout.layoutName,
                    

                    layoutZones:
                        layout.layoutZones ,

                    reasoning:
                        "Layout already selected by user",

                    candidates: [
                        toLayoutCandidate(layout)
                    ]
                }
            };
        }
    }

    // ─────────────────────────────────────────
    // Build context
    // ─────────────────────────────────────────

    const topic =
        input.topic ||
        input.prompt ||
        project.topic ||
        "";

    let trendHint = "";

    try {
        const discoveryToolCall = {
            id: "layout-discovery-1",

            function: {
                name: "web_search_tool",

                arguments: JSON.stringify({
                    query: `${topic} pinterest layout examples`,
                    max_results: 5,
                    include_images: true,
                    include_answer: true
                })
            }
        };

        const discoveryResults =
            await executeToolCalls([
                discoveryToolCall
            ]);

        const discovery =
            discoveryResults?.[0];

        if (
            !discovery?.error &&
            discovery?.cleanedResult?.answer
        ) {
            trendHint =
                discovery.cleanedResult.answer;
        }
    } catch (error) {
        console.warn(
            "[LAYOUT] Trend discovery failed."
        );
    }

    // ─────────────────────────────────────────
    // Available layouts
    // ─────────────────────────────────────────

    const availableLayouts =
        dedupeLayouts([
            ...(project.layoutOptions || [])
        ]);

    if (availableLayouts.length > 0) {
        const selected =
            selectBestLayout(
                availableLayouts,
                topic,
                trendHint
            );

        if (selected) {
            console.log(
                "[LAYOUT] Selected:",
                selected.name
            );

            return {
                success: true,

                data: {
                    id:
                        selected.id ||
                        crypto.randomUUID(),

                    layoutName:
                        selected.name ||
                        selected.layoutName,

                    layoutZones:
                        selected.zones ||
                        selected.layoutZones,

                    reasoning:
                        `Matched layout "${selected.name}"`,

                    candidates:
                        availableLayouts
                            .slice(0, 6)
                            .map(
                                toLayoutCandidate
                            )
                }
            };
        }
    }

    // ─────────────────────────────────────────
    // Fallback layout
    // ─────────────────────────────────────────

    console.log(
        "[LAYOUT] Using fallback layout"
    );

    return {
        success: true,

        data: {
            id: "minimal",

            layoutName:
                UNIVERSAL_MINIMAL_LAYOUT.name,

            layoutZones:
                UNIVERSAL_MINIMAL_LAYOUT.zones,

            reasoning:
                "No layouts available. Using fallback minimalist layout.",

            candidates: [
                toLayoutCandidate(
                    UNIVERSAL_MINIMAL_LAYOUT
                )
            ]
        }
    };
}

// ─────────────────────────────────────────────
// LAYOUT SELECTION
// ─────────────────────────────────────────────

function selectBestLayout(
    layouts: any[],
    topic: string,
    trendHint: string = ""
): any {
    if (!layouts?.length) {
        return null;
    }

    const trend =
        trendHint.toLowerCase();

    const needsMultiZone =
        /steps|list|ways|reasons|points|tips/i.test(
            topic
        );

    const prefersEditorial =
        /editorial|magazine|story/i.test(
            trend
        );

    const prefersMinimal =
        /minimal|clean|simple/i.test(
            trend
        );

    const sorted = [...layouts].sort(
        (a, b) => {
            const aZoneCount =
                Object.keys(
                    a.zones ||
                        a.layoutZones ||
                        {}
                ).length;

            const bZoneCount =
                Object.keys(
                    b.zones ||
                        b.layoutZones ||
                        {}
                ).length;

            const aStyle = String(
                a.recommendedStyle || ""
            ).toLowerCase();

            const bStyle = String(
                b.recommendedStyle || ""
            ).toLowerCase();

            const aEditorialBoost =
                prefersEditorial &&
                (aStyle.includes(
                    "editorial"
                ) ||
                    String(
                        a.layoutType || ""
                    ).includes(
                        "magazine"
                    ))
                    ? 2
                    : 0;

            const bEditorialBoost =
                prefersEditorial &&
                (bStyle.includes(
                    "editorial"
                ) ||
                    String(
                        b.layoutType || ""
                    ).includes(
                        "magazine"
                    ))
                    ? 2
                    : 0;

            const aMinimalBoost =
                prefersMinimal &&
                aStyle.includes(
                    "minimal"
                )
                    ? 1
                    : 0;

            const bMinimalBoost =
                prefersMinimal &&
                bStyle.includes(
                    "minimal"
                )
                    ? 1
                    : 0;

            const boostDelta =
                bEditorialBoost +
                bMinimalBoost -
                (aEditorialBoost +
                    aMinimalBoost);

            if (boostDelta !== 0) {
                return boostDelta;
            }

            if (needsMultiZone) {
                return (
                    bZoneCount -
                    aZoneCount
                );
            }

            return (
                aZoneCount -
                bZoneCount
            );
        }
    );

    return sorted[0];
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function toLayoutCandidate(
    layout: any
) {
    return {
        id:
            layout.id ||
            layout.layoutId ||
            "layout",

        name:
            layout.name ||
            layout.layoutName ||
            "Layout",

        layoutType:
            layout.layoutType,

        columnCount:
            layout.columnCount,

        zones:
            layout.zones ||
            layout.layoutZones ||
            {},

        roleMap:
            layout.roleMap || {},

        recommendedStyle:
            layout.recommendedStyle,

        description:
            layout.description || ""
    };
}

function dedupeLayouts(
    layouts: any[]
): any[] {
    const seen =
        new Set<string>();

    const deduped: any[] = [];

    for (const layout of layouts) {
        if (
            !layout ||
            !(
                layout.zones ||
                layout.layoutZones
            )
        ) {
            continue;
        }

        const key = String(
            layout.id ||
                layout.layoutId ||
                layout.name ||
                JSON.stringify(
                    layout.zones ||
                        layout.layoutZones
                )
        );

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);

        deduped.push(layout);
    }

    return deduped;
}