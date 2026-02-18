"use client";

import { Sparkles } from "lucide-react";
import AiImageCard from "./AiImageCard";

interface AiResultSectionProps {
    images: { url: string; prompt: string }[];
}

export default function AiResultSection({ images }: AiResultSectionProps) {
    if (images.length === 0) return null;

    return (
        <section className="space-y-6">
            <h3 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                AI Generated Designs
            </h3>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {images.map((img, i) => (
                    <AiImageCard
                        key={`ai-${i}`}
                        url={img.url}
                        prompt={img.prompt}
                    />
                ))}
            </div>
        </section>
    );
}
