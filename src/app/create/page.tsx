"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Image as ImageIcon, Wand2, User, Bot, Loader2 } from "lucide-react";
import { IPexelsPhoto, IPexelsResponse } from "@/models/Pexels";
import PexelsImageCard from "../components/PexelsImageCard";

interface Message {
    role: "user" | "assistant";
    content: string;
}

import { getLLMResponse } from "@/lib/llm/llm";

function renderMarkdown(text: string) {
    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];
    let currentBlock: { type: "ul" | "ol" | "table" | "quote" | null; items: any[] } = { type: null, items: [] };

    const flushBlock = () => {
        if (!currentBlock.type) return;

        const key = `block-${elements.length}`;
        if (currentBlock.type === "ul") {
            elements.push(<ul key={key} className="list-disc list-inside space-y-1.5 my-3 text-slate-300">{currentBlock.items}</ul>);
        } else if (currentBlock.type === "ol") {
            elements.push(<ol key={key} className="list-decimal list-inside space-y-1.5 my-3 text-slate-300">{currentBlock.items}</ol>);
        } else if (currentBlock.type === "quote") {
            elements.push(
                <blockquote key={key} className="border-l-4 border-primary/40 bg-primary/5 p-4 my-4 rounded-r-xl italic text-slate-300">
                    {currentBlock.items}
                </blockquote>
            );
        } else if (currentBlock.type === "table") {
            const rows = currentBlock.items;
            if (rows.length < 2) return; // Need at least header and separator

            const headerCells = rows[0].split("|").filter((c: string) => c.trim()).map((c: string, j: number) => (
                <th key={`th-${j}`} className="px-4 py-2 text-left text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-700">
                    {formatInline(c.trim())}
                </th>
            ));

            const bodyRows = rows.slice(2).map((row: string, i: number) => (
                <tr key={`tr-${i}`} className="border-b border-slate-800/50 hover:bg-white/5 transition-colors">
                    {row.split("|").filter((c: string) => c.trim()).map((c: string, j: number) => (
                        <td key={`td-${j}`} className="px-4 py-3 text-sm text-slate-300">
                            {formatInline(c.trim())}
                        </td>
                    ))}
                </tr>
            ));

            elements.push(
                <div key={key} className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
                    <table className="min-w-full border-collapse">
                        <thead><tr className="bg-slate-800/50">{headerCells}</tr></thead>
                        <tbody>{bodyRows}</tbody>
                    </table>
                </div>
            );
        }
        currentBlock = { type: null, items: [] };
    };

    const formatInline = (line: string): React.ReactNode[] => {
        const parts: React.ReactNode[] = [];
        // Combined regex for bold and inline code
        const regex = /(\*\*.+?\*\*|`.+?`)/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(line)) !== null) {
            if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));

            const content = match[0];
            if (content.startsWith("**")) {
                parts.push(<strong key={match.index} className="text-white font-bold">{content.slice(2, -2)}</strong>);
            } else if (content.startsWith("`")) {
                parts.push(<code key={match.index} className="bg-slate-800 text-primary px-1.5 py-0.5 rounded text-xs font-mono">{content.slice(1, -1)}</code>);
            }
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < line.length) parts.push(line.slice(lastIndex));
        return parts;
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();

        // Horizontal Rule
        if (trimmed === "---") { flushBlock(); elements.push(<hr key={`hr-${i}`} className="my-6 border-white/10" />); return; }

        // Headers
        const headerMatch = trimmed.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
            flushBlock();
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            const className = level === 1 ? "text-2xl font-black text-white mt-8 mb-4 border-b border-white/10 pb-2" :
                level === 2 ? "text-xl font-extrabold text-white mt-6 mb-3" :
                    "text-lg font-bold text-white mt-4 mb-2";
            elements.push(React.createElement(`h${level}`, { key: `h-${i}`, className }, formatInline(text)));
            return;
        }

        // Blockquote
        if (trimmed.startsWith(">")) {
            if (currentBlock.type !== "quote") flushBlock();
            currentBlock.type = "quote";
            currentBlock.items.push(<div key={`q-${i}`} className="my-1">{formatInline(trimmed.replace(/^>\s*/, ""))}</div>);
            return;
        }

        // Table Row
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
            if (currentBlock.type !== "table") flushBlock();
            currentBlock.type = "table";
            currentBlock.items.push(trimmed);
            return;
        }

        // Lists
        const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);
        const numberedMatch = trimmed.match(/^\d+\.\s+(.*)/);

        if (bulletMatch) {
            if (currentBlock.type !== "ul") flushBlock();
            currentBlock.type = "ul";
            currentBlock.items.push(<li key={`li-${i}`} className="pl-1">{formatInline(bulletMatch[1])}</li>);
        } else if (numberedMatch) {
            if (currentBlock.type !== "ol") flushBlock();
            currentBlock.type = "ol";
            currentBlock.items.push(<li key={`li-${i}`} className="pl-1">{formatInline(numberedMatch[1])}</li>);
        } else if (trimmed === "") {
            flushBlock();
            elements.push(<div key={`space-${i}`} className="h-2" />);
        } else {
            flushBlock();
            elements.push(<p key={`p-${i}`} className="my-2 leading-relaxed text-slate-300">{formatInline(trimmed)}</p>);
        }
    });

    flushBlock();
    return <div className="markdown-container">{elements}</div>;
}

export default function CreatePinPage() {
    const [prompt, setPrompt] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [images, setImages] = useState<IPexelsPhoto[]>([]);
    const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const toggleImage = (photo: IPexelsPhoto) => {
        setSelectedImages(prev => {
            const next = new Set(prev);
            if (next.has(photo.id)) {
                next.delete(photo.id);
            } else {
                next.add(photo.id);
            }
            return next;
        });
    };

    const handleSend = async () => {
        if (!prompt.trim() || isLoading) return;

        const userMessage = prompt.trim();
        setPrompt("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const data = await getLLMResponse(userMessage, messages);

            setMessages((prev) => [...prev, { role: "assistant", content: data.result }]);

            if (data.data?.photos) {
                setImages(data.data.photos);
            }
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden">
            {/* Left Sidebar - Chat & Control Panel (40%) */}
            <aside className="w-full md:w-[40%] border-r border-white/5 bg-slate-950 flex flex-col relative z-20">
                <div className="p-6 space-y-2 border-b border-white/5">
                    <h1 className="text-2xl font-black gradient-text flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-primary" />
                        AI Generator
                    </h1>
                    <p className="text-sm text-slate-400">
                        Tell me what you want to create, and I'll help you design the perfect pin.
                    </p>
                </div>

                {/* Chat / Conversation Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    <div className="glass-dark p-4 rounded-2xl border border-white/5 text-sm text-slate-300 leading-relaxed italic">
                        "I can help you generate titles, descriptions, hashtags, or even search for inspiration images. What's on your mind?"
                    </div>

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary/20 text-primary" : "bg-white/5 text-slate-400"
                                }`}>
                                {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                ? "bg-primary text-white rounded-tr-none"
                                : "bg-white/5 text-slate-300 border border-white/5 rounded-tl-none"
                                }`}>
                                {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            </div>
                            <div className="bg-white/5 text-slate-400 p-4 rounded-2xl rounded-tl-none border border-white/5 animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-6 border-t border-white/5 bg-slate-900/50">
                    <div className="relative group">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Describe your pin idea..."
                            className="w-full bg-slate-800 border-2 border-white/5 rounded-2xl p-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 transition-all resize-none h-32"
                        />
                        <button
                            onClick={handleSend}
                            className="absolute bottom-4 right-4 p-2 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            disabled={!prompt.trim() || isLoading}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="flex gap-2 mt-4 text-[10px] uppercase font-bold text-slate-500 tracking-widest pl-1">
                        <span className="flex items-center gap-1"><Wand2 className="w-3 h-3" /> Generate</span>
                        <span className="opacity-20">•</span>
                        <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Suggest Images</span>
                    </div>
                </div>
            </aside>

            {/* Right Main Content Area - Results */}
            <main className="flex-1 relative overflow-y-auto bg-slate-900/30 p-8">
                {images.length > 0 ? (
                    <>
                        {selectedImages.size > 0 && (
                            <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
                                <span className="bg-primary/20 text-primary px-3 py-1 rounded-full font-semibold">
                                    {selectedImages.size} selected
                                </span>
                            </div>
                        )}
                        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 animate-in fade-in duration-700">
                            {images.map((photo) => (
                                <PexelsImageCard
                                    key={photo.id}
                                    photo={photo}
                                    isSelected={selectedImages.has(photo.id)}
                                    onToggle={toggleImage}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-12">
                        <div className="text-center space-y-6 max-w-md animate-in fade-in zoom-in duration-700">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto ring-1 ring-primary/20">
                                <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">Your Result Area</h2>
                                <p className="text-slate-400 leading-relaxed">
                                    Use the side panel to start creating. Your generated pins, suggestions, and inspiration will appear here.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}