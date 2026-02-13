import { createClient } from "pexels";
import { IPexelsPhoto } from "@/models/Pexels";
import Link from "next/link";

export default async function CreatePin() {
    const apiKey = process.env.PEXELS_API_KEY?.trim();

    if (!apiKey) {
        return (
            <div className="container mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-error">Missing PEXELS_API_KEY in .env file</h1>
            </div>
        );
    }

    const client = createClient(apiKey);
    const query = "Nature Photos";

    // Explicitly casting the search result if needed, but the interface helps with structure
    const response = await client.photos.search({ query, per_page: 20 }) as any;
    const photos: IPexelsPhoto[] = response.photos;

    return (
        <div className="container mx-auto px-4 py-12 space-y-12">
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-6xl font-black gradient-text">
                    Fetch Inspiration
                </h1>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Browse high-quality images from Pexels to get ideas for your next pin.
                </p>
            </div>

            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                {photos.map((photo: IPexelsPhoto) => (
                    <div
                        key={photo.id}
                        className="break-inside-avoid group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-primary/50 transition-all duration-300"
                    >
                        <img
                            src={photo.src.large}
                            alt={photo.alt}
                            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                            style={{ backgroundColor: photo.avg_color }}
                        />

                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                            <p className="text-white font-bold line-clamp-2 mb-2">
                                {photo.alt || "Nature Inspiration"}
                            </p>
                            <div className="flex items-center justify-between">
                                <button className="btn btn-primary btn-xs rounded-lg">
                                    Use This
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {photos.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-slate-400">No inspiration found for "{query}"</p>
                </div>
            )}
        </div>
    );
}