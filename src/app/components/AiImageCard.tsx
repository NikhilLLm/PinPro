"use client";

import { Download, Save, Loader2 } from "lucide-react";
import { IKUpload } from "imagekitio-next";
import { useState, useRef } from "react";
import { useNotification } from "./Notification";
import { apiClient } from "@/lib/api-client";

interface AiImageCardProps {
    url: string; // This is the base64 string
    prompt: string;
}

export default function AiImageCard({ url, prompt }: AiImageCardProps) {
    if (url === "") return <div className="w-full h-auto object-cover"></div>;
    const [isSaving, setIsSaving] = useState(false);
    const { showNotification } = useNotification();
    const ikUploadRef = useRef<HTMLInputElement>(null);

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            // Trigger the hidden IKUpload component
            if (ikUploadRef.current) {
                // The IKUpload component expects a File object.
                // Since 'url' is now a base64 string, we need to convert it to a File.
                const response = await fetch(url);
                const blob = await response.blob();
                const file = new File([blob], `ai-${Date.now()}.png`, { type: blob.type });

                // Assign the file to the inputRef's files property
                // This is a common pattern for programmatically triggering file inputs
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                ikUploadRef.current.files = dataTransfer.files;

                // Manually dispatch a change event to trigger IKUpload's internal logic
                const event = new Event('change', { bubbles: true });
                ikUploadRef.current.dispatchEvent(event);
            }
        } catch (error) {
            console.error("Save failed:", error);
            showNotification("Failed to initiate save", "error");
            setIsSaving(false);
        }
    };

    const onUploadSuccess = async (res: any) => {
        try {
            await apiClient.createImage({
                title: prompt || "AI Generated Pin",
                description: `Created with AI: ${prompt}`,
                imageUrl: res.url,
            });
            showNotification("Pin saved to your collection!", "success");
        } catch (error) {
            showNotification("Failed to save to database", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const onUploadError = (err: any) => {
        console.error("Upload error:", err);
        showNotification("Failed to upload to ImageKit", "error");
        setIsSaving(false);
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
            {/* Hidden ImageKit Upload for the base64 */}
            <div className="hidden">
                <IKUpload
                    fileName={`ai-${Date.now()}.png`}
                    useUniqueFileName={true}
                    folder="/ai-pins"
                    ref={ikUploadRef}
                    onError={onUploadError}
                    onSuccess={onUploadSuccess}
                />
            </div>

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
