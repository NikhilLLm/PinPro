"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { IKImage } from "imagekitio-next";
import { IImage } from "@/models/Image";
import { apiClient } from "@/lib/api-client";
import { Loader2, Calendar, FileText } from "lucide-react";

export default function ImageDetailPage() {
    const [pin, setPin] = useState<IImage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { id } = useParams();

    useEffect(() => {
        const fetchPin = async () => {
            try {
                setLoading(true);
                const data = await apiClient.getImage(id as string);
                setPin(data);
            } catch (err) {
                console.error("Error fetching pin:", err);
                setError("Failed to load pin. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchPin();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[70vh]">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        );
    }

    if (error || !pin) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold text-error mb-4">{error || "Pin not found"}</h2>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Image Section */}
                <div className="lg:col-span-2">
                    {(() => {
                        const url = pin.imageUrl;
                        if (url.startsWith("data:")) {
                            return (
                                <img
                                    src={url}
                                    alt={pin.title}
                                    className="w-full h-full object-contain"
                                />
                            );
                        }
                        if (url.startsWith("http")) {
                            return (
                                <IKImage
                                    src={url}
                                    alt={pin.title}
                                    transformation={[{ height: "1500", width: "1000" }]}
                                    className="w-full h-full object-contain"
                                />
                            );
                        }
                        return (
                            <IKImage
                                path={url}
                                alt={pin.title}
                                transformation={[{ height: "1500", width: "1000" }]}
                                className="w-full h-full object-contain"
                            />
                        );
                    })()}
                </div>

                {/* Pin Details Section */}
                <div className="space-y-8">
                    <div className="glass-dark p-8 rounded-3xl border border-white/5 space-y-6">
                        <h1 className="text-4xl font-black tracking-tight gradient-text">
                            {pin.title}
                        </h1>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                <Calendar className="w-4 h-4 text-primary" />
                                {new Date(pin.createdAt!).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                                <FileText className="w-4 h-4 text-secondary" />
                                Pin
                            </div>
                        </div>

                        <div className="divider opacity-10"></div>

                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                Description
                            </h3>
                            <p className="text-slate-400 leading-relaxed text-lg">
                                {pin.description}
                            </p>
                        </div>
                    </div>

                    <div className="premium-card p-6 border border-primary/20 bg-primary/5">
                        <p className="text-sm font-medium text-primary">Pro Tip</p>
                        <p className="text-sm text-slate-400 mt-1">
                            You can save this pin or share it with your friends using the links below.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
