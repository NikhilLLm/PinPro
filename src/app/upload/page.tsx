"use client";

import ImageUploadForm from "../components/ImageUploadForm";

export default function ImageUploadPage() {
    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight gradient-text">
                        Upload New Pin
                    </h1>
                    <p className="text-slate-400 text-lg">
                        Share your inspiration with the world. Quality matters.
                    </p>
                </div>

                <ImageUploadForm />

                <div className="flex flex-wrap gap-6 justify-center text-sm text-slate-500 font-medium pt-8">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        JPEG / PNG / WebP Support
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        Max 5MB
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        Automatic Optimization
                    </div>
                </div>
            </div>
        </div>
    );
}
