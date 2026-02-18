import { IPexelsPhoto } from "@/types/pexels";
import { Check } from "lucide-react";

interface PexelsImageCardProps {
    photo: IPexelsPhoto;
    isSelected?: boolean;
    onToggle?: (photo: IPexelsPhoto) => void;
}

export default function PexelsImageCard({ photo, isSelected = false, onToggle }: PexelsImageCardProps) {
    return (
        <div
            className={`break-inside-avoid group relative rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-300 mb-6 cursor-pointer ${isSelected
                ? "border-primary ring-2 ring-primary/30"
                : "border-slate-800 hover:border-primary/50"
                }`}
            onClick={() => onToggle?.(photo)}
        >
            {/* Checkbox indicator */}
            <div className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected
                ? "bg-primary text-white scale-100"
                : "bg-black/40 backdrop-blur-sm border border-white/20 text-transparent group-hover:text-white/50 scale-90 group-hover:scale-100"
                }`}>
                <Check className="w-4 h-4" />
            </div>

            <img
                src={photo.src.large}
                alt={photo.alt || ""}
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundColor: photo.avg_color ?? undefined }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                <p className="text-white font-bold line-clamp-2 mb-2">
                    {photo.alt || "Inspiration"}
                </p>
                <div className="flex items-center justify-between">
                    <a
                        href={photo.photographer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-300 hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        @{photo.photographer}
                    </a>
                    <span className="text-[10px] text-slate-500 font-mono">
                        #{photo.id}
                    </span>
                </div>
            </div>
        </div>
    );
}
