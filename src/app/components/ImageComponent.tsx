"use client";

import { IKImage } from "imagekitio-next";
import Link from "next/link";
import { IImage } from "@/models/Image"
import { Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useNotification } from "./Notification";

export default function ImageComponent({ image }: { image: IImage }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotification();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this pin?")) return;

    setIsDeleting(true);
    try {
      await apiClient.deleteImage(image._id!.toString());
      showNotification("Pin deleted successfully", "success");
      // Simple refresh to update the feed
      window.location.reload();
    } catch (error) {
      console.error("Delete failed:", error);
      showNotification("Failed to delete pin", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden group hover:border-primary/50 transition-colors relative">
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-lg hover:bg-red-500 hover:border-red-500 transition-all duration-300 group/delete shadow-lg"
          title="Delete Pin"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4 text-white hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      <Link href={`/images/${image._id}`} className="block relative aspect-[2/3]">
        {(() => {
          const url = image.imageUrl;
          if (url.startsWith("data:")) {
            return (
              <img
                src={url}
                alt={image.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            );
          }
          if (url.startsWith("http")) {
            return (
              <IKImage
                src={url}
                alt={image.title}
                transformation={[{ height: "1500", width: "1000" }]}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            );
          }
          return (
            <IKImage
              path={url}
              alt={image.title}
              transformation={[{ height: "1500", width: "1000" }]}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          );
        })()}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="btn btn-primary btn-sm rounded-lg">View Pin</span>
        </div>
      </Link>

      <div className="p-4 space-y-2">
        <Link href={`/images/${image._id}`} className="block">
          <h2 className="text-lg font-bold text-white line-clamp-1 group-hover:text-primary transition-colors">
            {image.title}
          </h2>
        </Link>
        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
          {image.description}
        </p>
      </div>
    </div>
  );
}