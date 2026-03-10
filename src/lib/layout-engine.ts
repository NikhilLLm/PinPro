// ─── layout-engine.ts ───────────────────────────────
import { LLMLayer } from "@/types/llm-json";

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 1500;
export const MARGIN_X = 60;
export const TEXT_WIDTH = CANVAS_WIDTH - (MARGIN_X * 2);  // 880px

// Dynamic Y calculator — adapts to however many layers LLM returns
export function calculateYPositions(layers: LLMLayer[]): number[] {
    const positions: number[] = [];

    // Role-based zone mapping (percentage of canvas height)
    const ZONE_MAP: Record<string, { start: number; end: number }> = {
        hook: { start: 0.05, end: 0.20 },  // top 5-20%
        subheading: { start: 0.20, end: 0.30 },  // 20-30%
        body: { start: 0.55, end: 0.85 },  // middle-bottom zone
        tip: { start: 0.82, end: 0.90 },  // near bottom
        label: { start: 0.03, end: 0.06 },  // very top label
        cta: { start: 0.92, end: 0.97 },  // always at bottom
    };

    // group layers by role to distribute within zone
    const roleCounts: Record<string, number> = {};
    const roleIndex: Record<string, number> = {};

    layers.forEach(l => {
        roleCounts[l.role] = (roleCounts[l.role] || 0) + 1;
        roleIndex[l.role] = 0;
    });

    layers.forEach(layer => {
        const zone = ZONE_MAP[layer.role];
        const count = roleCounts[layer.role];
        const index = roleIndex[layer.role];
        const zoneSize = (zone.end - zone.start) * CANVAS_HEIGHT;

        // evenly distribute multiple layers of same role within zone
        const step = count > 1 ? zoneSize / count : 0;
        const y = Math.round((zone.start * CANVAS_HEIGHT) + (index * step));

        positions.push(y);
        roleIndex[layer.role]++;
    });

    return positions;
}