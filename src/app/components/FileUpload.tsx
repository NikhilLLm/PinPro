"use client";

import React, { useState, useRef } from "react";
import { Plus, X, Loader2 } from "lucide-react";

interface FileUploadProps {
    onImageSelect: (base64: string) => void;
    className?: string;
}

export default function FileUpload({ onImageSelect, className = "" }: FileUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setPreview(base64);
            onImageSelect(base64);
            setIsProcessing(false);
        };

        reader.onerror = () => {
            console.error("FileReader error");
            setIsProcessing(false);
        };

        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className={`${className}`}>
            <div className="relative">
                {!preview ? (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isProcessing}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-800 border-2 border-white/5 hover:border-primary/50 text-slate-400 hover:text-primary transition-all duration-300 shadow-lg"
                        title="Upload Reference Image"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Plus className="w-6 h-6" />
                        )}
                    </button>
                ) : (
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-primary/50 group/preview animate-in zoom-in-95 duration-300 shadow-lg shadow-primary/20">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                        <button
                            onClick={removeImage}
                            className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity duration-200"
                            title="Remove image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>
        </div>
    );
}