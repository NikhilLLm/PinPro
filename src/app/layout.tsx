import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./components/Providers";
import Header from "./components/Header";
import { NotificationProvider } from "./components/Notification";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* ✅ Website metadata */
export const metadata: Metadata = {
  title: {
    default: "PinPro",
    template: "%s | PinPro",
  },
  description: "PinPro – Discover, upload, and manage your image pins",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <NotificationProvider>
            <Header />
            <main>
              {children}
            </main>
          </NotificationProvider>
        </Providers>
      </body>
    </html>
  );
}
