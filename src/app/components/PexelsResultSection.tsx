"use client";

import { Image as ImageIcon } from "lucide-react";
import { IPexelsPhoto } from "@/types/pexels";
import PexelsImageCard from "./PexelsImageCard";

interface PexelsResultSectionProps {
    images: IPexelsPhoto[];
    selectedImages: Set<number | string>;
    onToggleImage: (photo: IPexelsPhoto) => void;
}

export default function PexelsResultSection({
    images,
    selectedImages,
    onToggleImage,
}: PexelsResultSectionProps) {
    if (images.length === 0) return null;

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Visual Inspiration
                </h3>
                {selectedImages.size > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                            {selectedImages.size} selected
                        </span>
                    </div>
                )}
            </div>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 animate-in fade-in duration-1000">
                {images.map((photo) => (
                    <PexelsImageCard
                        key={photo.id}
                        photo={photo}
                        isSelected={selectedImages.has(photo.id)}
                        onToggle={onToggleImage}
                    />
                ))}
            </div>
        </section>
    );
}
