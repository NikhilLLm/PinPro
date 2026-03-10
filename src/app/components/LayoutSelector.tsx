import React from 'react';
import { LayoutDefinition, LayoutZone } from '@/types/llm-json';
import { Check, Columns, Layers } from 'lucide-react';

interface LayoutSelectorProps {
    layouts: LayoutDefinition[];
    onSelect: (layout: LayoutDefinition) => void;
}

export default function LayoutSelector({ layouts, onSelect }: LayoutSelectorProps) {
    if (!layouts || layouts.length === 0) return null;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-primary" />
                        Trending Layouts Discovered
                    </h3>
                    <p className="text-sm text-slate-400">
                        Our Vision AI analyzed top-performing pins. Choose one to replicate its structural blueprint.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {layouts.map((layout, idx) => (
                    <div
                        key={idx}
                        className="group relative flex flex-col bg-slate-900/60 border border-white/10 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(233,30,99,0.15)]"
                    >
                        {/* Preview Header */}
                        <div className="aspect-[2/3] bg-slate-950/80 relative p-4 group-hover:bg-slate-950 transition-colors">
                            <LayoutPreview layout={layout} />
                        </div>

                        {/* Info Section */}
                        <div className="p-5 space-y-3 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-white leading-tight">{layout.name}</h4>
                                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase text-slate-400">
                                    <Columns className="w-3 h-3" />
                                    {layout.columnCount} Col
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                                {layout.description}
                            </p>

                            <div className="pt-2 mt-auto">
                                <button
                                    onClick={() => onSelect(layout)}
                                    className="w-full py-3 bg-white/5 hover:bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl border border-white/10 hover:border-primary transition-all flex items-center justify-center gap-2 group-active:scale-95"
                                >
                                    Use This Blueprint
                                    <Check className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function LayoutPreview({ layout }: { layout: LayoutDefinition }) {
    const zones = Object.entries(layout.zones);

    return (
        <div className="w-full h-full border border-white/5 rounded-xl overflow-hidden relative bg-slate-900/40">
            {/* Grid Lines Hint */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10 pointer-events-none">
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
                <div className="border border-white/20"></div>
            </div>

            <svg viewBox="0 0 1000 1000" className="w-full h-full drop-shadow-2xl">
                {zones.map(([key, zone], i) => (
                    <g key={key}>
                        <rect
                            x={zone.x}
                            y={zone.y}
                            width={zone.width}
                            height={zone.height}
                            fill={getRoleColor(zone.role, 0.2)}
                            stroke={getRoleColor(zone.role, 0.6)}
                            strokeWidth="4"
                            rx="10"
                            className="animate-in fade-in zoom-in duration-500"
                            style={{ animationDelay: `${i * 100}ms` }}
                        />
                        <text
                            x={zone.x + 20}
                            y={zone.y + 40}
                            fill="white"
                            fontSize="24"
                            fontWeight="bold"
                            className="opacity-40 uppercase tracking-tighter"
                        >
                            {zone.role}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

function getRoleColor(role: string, alpha: number) {
    const colors: Record<string, string> = {
        hook: `rgba(233, 30, 99, ${alpha})`,      // Pink
        subheading: `rgba(156, 39, 176, ${alpha})`, // Purple
        body: `rgba(63, 81, 181, ${alpha})`,      // Indigo
        cta: `rgba(0, 150, 136, ${alpha})`,       // Teal
        step: `rgba(255, 193, 7, ${alpha})`,      // Amber
        column: `rgba(205, 220, 57, ${alpha})`,    // Lime
        center: `rgba(33, 150, 243, ${alpha})`,    // Blue
        tip: `rgba(255, 87, 34, ${alpha})`,        // Deep Orange
    };
    return colors[role] || `rgba(255, 255, 255, ${alpha})`;
}
