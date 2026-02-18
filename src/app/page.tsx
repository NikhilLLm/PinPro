"use client";

import React, { useEffect, useState } from "react";
import ImageFeed from "./components/ImageFeed";
import { IImage } from "@/models/Image";
import { apiClient } from "@/lib/api-client";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function Home() {
  const { data: session } = useSession();
  const [images, setImages] = useState<IImage[]>([]);
  const [userImages, setUserImages] = useState<IImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const data = await apiClient.getImages();
        setImages(data);
        if (session?.user?.email) {
          const filtered = data.filter((v: any) => v.userId === (session.user as any)?.id || v.userEmail === session.user?.email);
          setUserImages(filtered);
        }
      } catch (error) {
        console.error("Error fetching pins:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [session]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // LOGGED OUT VIEW
  if (!session) {
    return (
      <main className="container mx-auto px-4 py-32 flex flex-col items-center">
        <div className="max-w-3xl bg-slate-900 border border-slate-800 p-12 rounded-xl text-center space-y-8 shadow-2xl">
          <h1 className="text-4xl md:text-6xl font-black text-white">
            Welcome to <span className="text-primary">PinPro</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl leading-relaxed">
            Discover and share your inspiration. This platform allows you to create, manage, and share high-quality image pins powered by AI and ImageKit.
          </p>
          <div className="space-y-4 pt-6">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Ready to start?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="px-8 py-3 bg-primary text-white font-bold rounded hover:opacity-90 transition-all">
                SignIn to Get Started
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // LOGGED IN (DASHBOARD) VIEW
  return (
    <main className="container mx-auto px-4 pt-20 pb-12 space-y-16">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl ring-1 ring-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-4xl font-black text-white tracking-tight">Your DashBoard</h1>
            <p className="text-slate-400 text-lg">Your personal space for managing and viewing your saved pins.</p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-8 min-w-[280px] shadow-inner text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Saved Pins</p>
            <p className="text-7xl font-black text-primary leading-none">{userImages.length}</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-white tracking-tight">Recent Pins</h2>
        </div>
        <ImageFeed images={images} />
      </div>
    </main>
  );
}