"use client";

import { Download, Save, Loader2, ImagePlus, Check } from "lucide-react";

import { useState } from "react";
import { useNotification } from "./Notification";
import { apiClient } from "@/lib/api-client";

interface AiImageCardProps {
    url: string;
    prompt: string;
    pinUrl?: string;
    isApprovedBg?: boolean;
    onUseAsBackground?: () => void;
}

export default function AiImageCard({ url, prompt, pinUrl, isApprovedBg, onUseAsBackground }: AiImageCardProps) {
    if (url === "") return <div className="w-full h-auto object-cover"></div>;

    const [isSaving, setIsSaving] = useState(false);
    const { showNotification } = useNotification();

    const displayUrl = pinUrl || url;

    const handleSave = async () => {
        if (isSaving || !displayUrl) return;
        setIsSaving(true);
        try {
            await apiClient.createImage({
                title: prompt || "AI Generated Pin",
                description: `Created with AI: ${prompt}`,
                imageUrl: displayUrl,
                fileId: "",
            });
            showNotification("Pin saved to your collection!", "success");
        } catch (error) {
            console.error("Save failed:", error);
            showNotification("Failed to save image", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        try {
            const response = await fetch(displayUrl);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `ai-pin-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    return (
        <div className={`break-inside-avoid group relative rounded-2xl overflow-hidden bg-slate-900 border-2 transition-all duration-300 mb-6 shadow-xl ${isApprovedBg
                ? "border-emerald-500 ring-2 ring-emerald-500/30 shadow-emerald-500/10"
                : "border-primary/30 hover:border-primary shadow-primary/5"
            }`}>

            {/* Approved Badge */}
            {isApprovedBg && (
                <div className="absolute top-3 left-3 z-20 px-3 py-1.5 bg-emerald-500/90 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-lg">
                    <Check className="w-3 h-3 text-white" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">Background Locked</span>
                </div>
            )}

            <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Use as Background button */}
                {onUseAsBackground && !isApprovedBg && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onUseAsBackground(); }}
                        className="p-2 bg-emerald-500/80 backdrop-blur-md border border-emerald-400/50 rounded-full hover:bg-emerald-500 hover:scale-110 transition-all duration-300 shadow-lg"
                        title="Use as Pin Background"
                    >
                        <ImagePlus className="w-5 h-5 text-white" />
                    </button>
                )}
                <button
                    onClick={handleDownload}
                    className="p-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full hover:bg-primary hover:border-primary transition-all duration-300 group/btn"
                    title="Download Image"
                >
                    <Download className="w-5 h-5 text-white" />
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 bg-primary backdrop-blur-md border border-primary/50 rounded-full hover:scale-110 transition-all duration-300 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Save Pin"
                >
                    {isSaving ? (
                        <Loader2 className="w-5 h-5 text-white animate-spin" />
                    ) : (
                        <Save className="w-5 h-5 text-white" />
                    )}
                </button>
            </div>

            {!isApprovedBg && (
                <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-md">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                        AI Generated
                    </span>
                </div>
            )}

            <img
                src={displayUrl}
                alt={prompt || "AI Generated Image"}
                className="w-full h-auto object-cover"
            />

            <div className="p-4 bg-slate-900 border-t border-white/5">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-mono">
                        Powered by Flux.1
                    </span>
                    <span className="text-[10px] text-slate-600 font-medium uppercase tracking-[0.2em]">AI Generation</span>
                </div>
            </div>
        </div>
    );
}
