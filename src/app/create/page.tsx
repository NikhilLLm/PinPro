"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Wand2, Loader2, ArrowRight } from "lucide-react";
import AiResultSection from "../components/AiResultSection";
import PexelsResultSection from "../components/PexelsResultSection";
import FileUpload from "../components/FileUpload";
import LayoutSelector from "../components/LayoutSelector";
import { LayoutDefinition } from "@/types/llm-json";
import { createProject, generateMinimalContent, generateBackground, generateLayout, generatePin } from "@/lib/llm/llm";
import AiImageCard from "../components/AiImageCard";

type MiniContent = {
    headline: string;
    body: string[];
    cta: string;
};

type MiniBackground = {
    url: string;
    prompt: string;
};

const MINI_LAYOUTS: LayoutDefinition[] = [
    {
        id: "layout-a",
        name: "Layout A",
        description: "Simple headline, body, CTA.",
        layoutType: "overlay",
        columnCount: 1,
        zones: {
            title: { x: 110, y: 120, width: 780, height: 160, align: "center", role: "hook" },
            body: { x: 110, y: 340, width: 780, height: 520, align: "left", role: "body" },
            cta: { x: 110, y: 1180, width: 780, height: 120, align: "center", role: "cta" },
        },
        roleMap: { hook: ["title"], body: ["body"], cta: ["cta"] },
        recommendedStyle: "bold",
    },
    {
        id: "layout-b",
        name: "Layout B",
        description: "Two body blocks and a centered CTA.",
        layoutType: "split",
        columnCount: 2,
        zones: {
            title: { x: 90, y: 110, width: 820, height: 150, align: "center", role: "hook" },
            left: { x: 90, y: 320, width: 360, height: 620, align: "left", role: "body" },
            right: { x: 550, y: 320, width: 360, height: 620, align: "left", role: "body" },
            cta: { x: 90, y: 1190, width: 820, height: 120, align: "center", role: "cta" },
        },
        roleMap: { hook: ["title"], body: ["left", "right"], cta: ["cta"] },
        recommendedStyle: "editorial",
    },
    {
        id: "layout-c",
        name: "Layout C",
        description: "Card-like list layout.",
        layoutType: "card_grid",
        columnCount: 1,
        zones: {
            title: { x: 95, y: 100, width: 810, height: 130, align: "center", role: "hook" },
            card1: { x: 95, y: 310, width: 810, height: 180, align: "left", role: "step" },
            card2: { x: 95, y: 520, width: 810, height: 180, align: "left", role: "step" },
            card3: { x: 95, y: 730, width: 810, height: 180, align: "left", role: "step" },
            cta: { x: 95, y: 1185, width: 810, height: 115, align: "center", role: "cta" },
        },
        roleMap: { hook: ["title"], step: ["card1", "card2", "card3"], cta: ["cta"] },
        recommendedStyle: "minimal",
    },
];

const MINI_BACKGROUNDS: MiniBackground[] = [
    { url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80", prompt: "Coding desk" },
    { url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80", prompt: "Developer workspace" },
    { url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80", prompt: "Code editor screen" },
    { url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80", prompt: "Abstract tech light" },
];

function makeMiniContent(topic: string): MiniContent {
    return {
        headline: topic ? `5 Ways to Win with ${topic}` : "5 Tips to Get Started",
        body: ["1. Start with a clear goal", "2. Add context", "3. Use small steps", "4. Check the result", "5. Refine quickly"],
        cta: "See the full breakdown",
    };
}

function MiniPanel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
    return (
        <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-black/20 flex flex-col justify-between">
            <div>
                <div className="mb-4 space-y-1">
                    <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-slate-300">{title}</h3>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                {children}
            </div>
        </section>
    );
}

export default function CreatePinPage() {
    const [topic, setTopic] = useState("");
    const [content, setContent] = useState<MiniContent>(makeMiniContent(""));
    const [layouts, setLayouts] = useState<LayoutDefinition[]>(MINI_LAYOUTS);
    const [selectedLayout, setSelectedLayout] = useState<LayoutDefinition | null>(MINI_LAYOUTS[0]);
    const [selectedBackground, setSelectedBackground] = useState<MiniBackground>(MINI_BACKGROUNDS[0]);
    const [backgrounds, setBackgrounds] = useState<MiniBackground[]>(MINI_BACKGROUNDS);
    const [isGeneratingContent, setIsGeneratingContent] = useState(false);
    const [isGeneratingPin, setIsGeneratingPin] = useState(false);
    const [pinVariants, setPinVariants] = useState<{ id: string; name: string; url: string }[]>([]);

    // SEO States
    const [seoKeywords, setSeoKeywords] = useState("");
    const [seoHashtags, setSeoHashtags] = useState("");

    // Prompt refine states
    const [contentPrompt, setContentPrompt] = useState("");
    const [layoutPrompt, setLayoutPrompt] = useState("");
    const [backgroundPrompt, setBackgroundPrompt] = useState("");
    const [projectId, setProjectId] = useState("")

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (topic.trim() || pinVariants.length > 0) {
                e.preventDefault();
                e.returnValue = "Are you sure you want to leave? Your progress will be lost.";
                return e.returnValue;
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [topic, pinVariants]);

    const handleGenerateContent = async () => {
        if (!topic.trim()) return;
        setIsGeneratingContent(true);
        try {
            const res = await createProject(topic.trim());
            console.log(res)
            if (res.success) {
                if (res.content) {
                    setContent(res.content);
                }
                if (res.layouts && res.layouts.length > 0) {
                    setLayouts(res.layouts);
                    setSelectedLayout(res.layouts[0]);
                }
                if (res.backgrounds && res.backgrounds.length > 0) {
                    setBackgrounds(res.backgrounds);
                    setSelectedBackground(res.backgrounds[0]);
                }
                if (res.projectId) {
                    setProjectId(projectId)
                }
            }
        } catch (error) {
            console.error("Failed to generate project content:", error);
        } finally {
            setIsGeneratingContent(false);
        }
    };

    const handleRefineContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contentPrompt.trim()) return;
        setIsGeneratingContent(true);
        try {
            const res = await generateMinimalContent(`${topic} (Refinement: ${contentPrompt.trim()})`);
            if (res.success && res.content) {
                setContent(res.content);
            }
        } catch (error) {
            console.error("Failed to refine content:", error);
        } finally {
            setIsGeneratingContent(false);
            setContentPrompt("");
        }
    };

    const handleRefineLayout = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!layoutPrompt.trim()) return;
        try {
            const res = await generateLayout(topic, layoutPrompt.trim());
            if (res.success && res.layouts && res.layouts.length > 0) {
                setLayouts(res.layouts);
                setSelectedLayout(res.layouts[0]);
            }
        } catch (error) {
            console.error("Failed to refine layout blueprint:", error);
        }
        setLayoutPrompt("");
    };

    const handleRefineBackground = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!backgroundPrompt.trim()) return;
        try {
            const res = await generateBackground(topic, backgroundPrompt.trim());
            if (res.success && res.backgrounds && res.backgrounds.length > 0) {
                setBackgrounds(res.backgrounds);
                setSelectedBackground(res.backgrounds[0]);
            }
        } catch (error) {
            console.error("Failed to generate backgrounds:", error);
        }
        setBackgroundPrompt("");
    };

    const handleGeneratePin = async () => {
        if (!selectedLayout || !selectedBackground) return;
        setIsGeneratingPin(true);
        try {
            const res = await generatePin({
                projectId,
                topic,
                content,
                layout: selectedLayout,
                background: selectedBackground
            });
            if (res.success && res.variants) {
                setPinVariants(res.variants);
                if (res.seo) {
                    setSeoKeywords(res.seo.keywords ? res.seo.keywords.join(", ") : "");
                    setSeoHashtags(res.seo.hashtags ? res.seo.hashtags.join(" ") : "");
                }
            }
        } catch (error) {
            console.error("Failed to generate pin variants:", error);
        } finally {
            setIsGeneratingPin(false);
        }
    };

    const canGeneratePin = !!selectedLayout && !!selectedBackground;

    return (
        <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-white">
            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
                {/* Header Board */}
                <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl shadow-black/20">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Creation Dashboard</p>
                            <h1 className="text-3xl font-black tracking-tight lg:text-4xl">Step-by-Step Pinterest Creative Flow</h1>
                            <p className="max-w-2xl text-sm text-slate-400">Type your main topic, customize copy in the Content Panel, choose structure, and select/upload backgrounds.</p>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4">
                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Type Idea about pin to generate</label>
                            <input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-600"
                                placeholder="e.g. 5 Claude Code Tips for Developers"
                            />
                        </div>
                        <button
                            onClick={handleGenerateContent}
                            disabled={isGeneratingContent || !topic.trim()}
                            className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isGeneratingContent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            Generate
                        </button>
                    </div>
                </div>

                {/* Main Content Area: Left Config Column & Right Result Column */}
                <div className="mt-6 flex flex-col gap-6 items-start">

                    {/* Left Column: Configuration Panels */}
                    <div className="w-full shrink-0 flex flex-col gap-6">

                        {/* Content Panel */}
                        <MiniPanel title="Content Panel" description="Manually edit the copy or refine via AI prompt.">
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Headline</label>
                                    <input
                                        type="text"
                                        value={content.headline}
                                        onChange={(e) => setContent({ ...content, headline: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 font-semibold"
                                    />
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Body points</label>
                                    <div className="space-y-2">
                                        {content.body.map((line, index) => (
                                            <input
                                                key={index}
                                                type="text"
                                                value={line}
                                                onChange={(e) => {
                                                    const nextBody = [...content.body];
                                                    nextBody[index] = e.target.value;
                                                    setContent({ ...content, body: nextBody });
                                                }}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary/50"
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">CTA (Call-to-Action)</label>
                                    <input
                                        type="text"
                                        value={content.cta}
                                        onChange={(e) => setContent({ ...content, cta: e.target.value })}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50 font-medium"
                                    />
                                </div>

                                {/* Prompt to change */}
                                <form onSubmit={handleRefineContent} className="mt-4 pt-4 border-t border-white/5 space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Prompt to change</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={contentPrompt}
                                            onChange={(e) => setContentPrompt(e.target.value)}
                                            placeholder="e.g. make the tone more playful"
                                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-white/10 hover:bg-primary px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                                        >
                                            Refine
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </MiniPanel>

                        {/* Layout Panel */}
                        <MiniPanel title="Layout Panel" description="Select a layout or search a trending structure.">
                            <div className="space-y-4">
                                <LayoutSelector
                                    layouts={layouts}
                                    onSelect={setSelectedLayout}
                                    selectedLayoutId={selectedLayout?.id || selectedLayout?.name}
                                />

                                {/* Prompt to change */}
                                <form onSubmit={handleRefineLayout} className="pt-4 border-t border-white/5 space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Prompt to change layout</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={layoutPrompt}
                                            onChange={(e) => setLayoutPrompt(e.target.value)}
                                            placeholder="e.g. show editorial styles"
                                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-white/10 hover:bg-primary px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </MiniPanel>

                        {/* Background Panel */}
                        <MiniPanel title="Background Panel" description="Choose backdrops, upload files or prompt AI.">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <FileUpload onImageSelect={(base64) => {
                                        const next = { url: base64, prompt: "Uploaded background" };
                                        setBackgrounds((prev) => [next, ...prev]);
                                        setSelectedBackground(next);
                                    }} />
                                    <div>
                                        <p className="text-sm font-semibold text-white">Upload image</p>
                                        <p className="text-xs text-slate-500">Drop an image here or click</p>
                                    </div>
                                </div>

                                {/* ✅ CHANGED: grid now 2-col, each card uses aspect-[2/3] Pinterest ratio */}
                                <div className="grid grid-cols-2 gap-3">
                                    {backgrounds.map((bg) => (
                                        <div
                                            key={bg.url}
                                            onClick={() => setSelectedBackground(bg)}
                                            className="aspect-[2/3] w-full cursor-pointer"
                                        >
                                            <AiImageCard
                                                url={bg.url}
                                                prompt=""
                                                isApprovedBg={selectedBackground.url === bg.url}
                                                className="h-full w-full mb-0"
                                                imageContainerClassName="flex-1 min-h-0"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Prompt to change */}
                                <form onSubmit={handleRefineBackground} className="pt-4 border-t border-white/5 space-y-2">
                                    <label className="block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Prompt to change background</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={backgroundPrompt}
                                            onChange={(e) => setBackgroundPrompt(e.target.value)}
                                            placeholder="e.g. generate a bright neon gradient"
                                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-white/10 hover:bg-primary px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                                        >
                                            AI Gen
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </MiniPanel>
                    </div>

                    {/* Right Column: Generated Pins Section */}
                    <div className="flex-1 w-full min-w-0 sticky top-6">
                        <section className="rounded-3xl border border-white/10 bg-slate-950/80 p-5 shadow-xl shadow-black/20">
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-white">Final Output</h2>
                                    <p className="text-sm text-slate-500">Generate final pin variants only after content, layout, and background are selected.</p>
                                </div>
                                <button onClick={handleGeneratePin} disabled={!canGeneratePin || isGeneratingPin} className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                                    {isGeneratingPin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    Generate Pin
                                </button>
                            </div>

                            {pinVariants.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {pinVariants.map((variant) => (
                                            <div key={variant.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg">
                                                <div className="aspect-[2/3] relative">
                                                    <AiImageCard url={variant.url} prompt={variant.name} />
                                                </div>
                                                <div className="border-t border-white/5 p-3">
                                                    <p className="text-sm font-semibold text-white truncate">{variant.name}</p>
                                                    <p className="text-xs text-slate-500">Preview variant</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Pinterest Title</label>
                                            <input value={content.headline} readOnly className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Pinterest Description</label>
                                            <textarea value={`${content.body.join(" • ")} • ${content.cta}`} readOnly className="min-h-[92px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">SEO Keywords</label>
                                            <textarea readOnly value={seoKeywords} className="min-h-[92px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
                                        </div>
                                        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Hashtags</label>
                                            <textarea readOnly value={seoHashtags} className="min-h-[92px] w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-8 text-center text-sm text-slate-500">Select all three panels, then click Generate Pin.</div>
                            )}
                        </section>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    {selectedLayout && selectedBackground ? "Ready to generate pin variants." : "Pick one layout and one background to continue."}
                </div>
            </div>
        </div>
    );
}