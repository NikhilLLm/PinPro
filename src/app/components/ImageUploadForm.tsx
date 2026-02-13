"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { IKUploadResponse } from "imagekitio-next/dist/types/components/IKUpload/props";
import { Loader2 } from "lucide-react";
import { useNotification } from "./Notification";
import { apiClient } from "@/lib/api-client";
import FileUpload from "./FileUpload";

interface ImageFormData {
  title: string;
  description: string;
  imageUrl: string;
}

export default function ImageUploadForm() {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { showNotification } = useNotification();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ImageFormData>({
    defaultValues: {
      title: "",
      description: "",
      imageUrl: "",
    },
  });

  const handleUploadSuccess = (response: IKUploadResponse) => {
    setValue("imageUrl", response.filePath);
    showNotification("Image uploaded successfully!", "success");
  };

  const handleUploadProgress = (progress: number) => {
    setUploadProgress(progress);
  };

  const onSubmit = async (data: ImageFormData) => {
    if (!data.imageUrl) {
      showNotification("Please upload an image first", "error");
      return;
    }

    setLoading(true);
    try {
      await apiClient.createImage(data);
      showNotification("Pin published successfully!", "success");

      // Reset form after successful submission
      setValue("title", "");
      setValue("description", "");
      setValue("imageUrl", "");
      setUploadProgress(0);
    } catch (error) {
      showNotification(
        error instanceof Error ? error.message : "Failed to publish pin",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Title</label>
          <input
            type="text"
            placeholder="Enter a catchy title"
            className={`w-full px-4 py-3 rounded-lg bg-base-100 border ${errors.title ? "border-error/50" : "border-slate-700"
              } focus:border-primary outline-none transition-all placeholder:text-slate-600 text-white`}
            {...register("title", { required: "Title is required" })}
          />
          {errors.title && (
            <span className="text-error text-xs ml-1 font-medium">{errors.title.message}</span>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-300 ml-1">Description</label>
          <textarea
            placeholder="What's this pin about?"
            className={`w-full px-4 py-3 rounded-lg bg-base-100 border h-32 resize-none ${errors.description ? "border-error/50" : "border-slate-700"
              } focus:border-primary outline-none transition-all placeholder:text-slate-600 text-white leading-relaxed`}
            {...register("description", { required: "Description is required" })}
          />
          {errors.description && (
            <span className="text-error text-xs ml-1 font-medium">{errors.description.message}</span>
          )}
        </div>

        <div className="space-y-4">
          <label className="text-sm font-semibold text-slate-300 ml-1 block">Image File</label>
          <div className="p-4 rounded-lg border-2 border-slate-700 border-dashed hover:border-primary/50 transition-colors">
            <FileUpload
              fileType="image"
              onSuccess={handleUploadSuccess}
              onProgress={handleUploadProgress}
            />
          </div>

          {uploadProgress > 0 && (
            <div className="space-y-2 px-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 font-medium">Upload Progress</span>
                <span className="text-white font-bold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full btn btn-primary py-3 rounded-lg font-bold text-base shadow-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          disabled={loading || !uploadProgress}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Publishing Pin...</span>
            </div>
          ) : (
            "Publish Pin"
          )}
        </button>
      </form>
    </div>
  );
}