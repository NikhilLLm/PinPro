"use client";

import { Download, Save, Loader2 } from "lucide-react";

import { useState } from "react";
import { useNotification } from "./Notification";
import { apiClient } from "@/lib/api-client";
import { upload } from "@imagekit/next";

interface AiImageCardProps {
    url: string; // This is the base64 string
    prompt: string;
}

export default function AiImageCard({ url, prompt }: AiImageCardProps) {
    if (url === "") return <div className="w-full h-auto object-cover"></div>;
    const [isSaving, setIsSaving] = useState(false);
    const { showNotification } = useNotification();

    const handleSave = async () => {
        if (isSaving || !url) return;
        setIsSaving(true);
        try {
            // 1. Get authentication parameters from our API
            const authResponse = await fetch("/api/imagekit-auth");
            if (!authResponse.ok) throw new Error("Auth failed");
            const authData = await authResponse.json();

            // 2. Call the upload function directly
            const res = await upload({
                file: url,
                fileName: `ai-${Date.now()}.png`,
                publicKey: process.env.NEXT_PUBLIC_PUBLIC_KEY || "",
                token: (authData.token as string) || "",
                signature: (authData.signature as string) || "",
                expire: (authData.expire as number) || 0,
                folder: "/ai-pins",
                useUniqueFileName: true,
            });

            // 3. Save to database
            await apiClient.createImage({
                title: prompt || "AI Generated Pin",
                description: `Created with AI: ${prompt}`,
                imageUrl: (res.filePath as string) || "",
                fileId: (res.fileId as string) || "",
            });

            showNotification("Pin saved to your collection!", "success");
        } catch (error) {
            console.error("Save failed:", error);
            showNotification(
                error instanceof Error ? error.message : "Failed to save image",
                "error"
            );
        } finally {
            setIsSaving(false);
        }
    };
    const handleDownload = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `ai-gen-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
        }
    };

    return (
        <div className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-primary/30 hover:border-primary transition-all duration-300 mb-6 shadow-xl shadow-primary/5">

            <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

            <div className="absolute top-3 left-3 z-10 px-2 py-1 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-md">
                <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">AI Generated</span>
            </div>

            <img
                src={url}
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
