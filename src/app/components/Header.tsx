"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useNotification } from "./Notification";

export default function Header() {
  const { data: session } = useSession();
  const { showNotification } = useNotification();

  const handleSignOut = async () => {
    try {
      await signOut();
      showNotification("Signed out successfully", "success");
    } catch {
      showNotification("Failed to sign out", "error");
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 h-16">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Left */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="px-4 py-1.5 border border-slate-700 rounded font-bold text-white hover:bg-slate-800 transition"
          >
            PinPro
          </Link>

          {session && (
            <nav className="flex items-center gap-4">
              <Link className="text-sm font-semibold text-slate-400 hover:text-white" href="/">
                Dashboard
              </Link>
              <Link className="text-sm font-semibold text-slate-400 hover:text-white" href="/">
                Explore
              </Link>
              <Link className="text-sm font-semibold text-slate-400 hover:text-white" href="/upload">
                Upload
              </Link>
              <Link className="text-sm font-semibold text-slate-400 hover:text-white" href="/create">
                Create
              </Link>
            </nav>
          )}
        </div>

        {/* Right */}
        <div className="relative">
          {!session ? (
            <Link
              href="/login"
              className="px-6 py-2 border border-slate-700 rounded font-bold text-white hover:bg-slate-800 text-sm"
            >
              Sign In
            </Link>
          ) : (
            <details className="group">
              <summary className="px-6 py-2 border border-slate-700 rounded font-bold text-slate-300 hover:bg-slate-800 cursor-pointer list-none text-sm">
                {session.user?.email?.split("@")[0]}
              </summary>

              {/* ABSOLUTE dropdown */}
              <ul className="absolute right-0 mt-2 w-52 p-1 rounded border border-slate-800 bg-slate-900 shadow-2xl z-[999]">
                <li className="px-4 py-3 border-b border-slate-800">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Account
                  </span>
                  <p className="text-sm font-bold text-white truncate">
                    {session.user?.email}
                  </p>
                </li>

                <li>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-800 transition"
                  >
                    Sign Out
                  </button>
                </li>
              </ul>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}
