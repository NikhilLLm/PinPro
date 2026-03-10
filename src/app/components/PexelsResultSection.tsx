"use client";

import { Image as ImageIcon } from "lucide-react";
import { IPexelsPhoto } from "@/types/pexels";
import PexelsImageCard from "./PexelsImageCard";
import { selectedImages } from "@/types/hugging-flux";

interface PexelsResultSectionProps {
    images: IPexelsPhoto[];
    selectedImages: selectedImages[];
    onToggleImage: (photo: IPexelsPhoto) => void;
    approvedBgUrl: string | null;
    onUseAsBackground: (url: string) => void;
}

export default function PexelsResultSection({
    images,
    selectedImages,
    onToggleImage,
    approvedBgUrl,
    onUseAsBackground,
}: PexelsResultSectionProps) {
    if (images.length === 0) return null;

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Visual Inspiration
                </h3>
                {selectedImages.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-semibold">
                            {selectedImages.length} selected
                        </span>
                    </div>
                )}
            </div>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 animate-in fade-in duration-1000">
                {images.map((photo) => (
                    <PexelsImageCard
                        key={photo.id}
                        photo={photo}
                        isSelected={selectedImages.some(img => img.id === photo.id)}
                        onToggle={onToggleImage}
                        isApprovedBg={approvedBgUrl === photo.src.large}
                        onUseAsBackground={() => onUseAsBackground(photo.src.large)}
                    />
                ))}
            </div>
        </section>
    );
}
