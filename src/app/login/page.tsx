"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotification } from "../components/Notification";
import Link from "next/link";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();
    const { showNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            showNotification(result.error, "error");
        } else {
            showNotification("Login successful!", "success");
            router.push("/");
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="glass-dark w-full max-w-md p-10 rounded-3xl border border-white/5 shadow-2xl space-y-8">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black tracking-tight gradient-text">Welcome Back</h1>
                    <p className="text-slate-400">Sign in to your ReelPro account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-slate-300 ml-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-slate-300 ml-1">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full px-5 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-slate-600 shadow-inner"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full btn btn-primary py-4 rounded-xl font-bold shadow-lg shadow-primary/20 border-none transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Sign In
                    </button>
                </form>

                <p className="text-center text-slate-400">
                    Don&apos;t have an account?{" "}
                    <Link href="/register" className="text-primary font-bold hover:underline transition-all">
                        Create account
                    </Link>
                </p>
            </div>
        </div>
    );
}