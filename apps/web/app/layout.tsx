import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";
import { QueryProvider, THEME_SCRIPT } from "@/core";
import { PwaProvider } from "@/components/pwa/pwa-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export const metadata: Metadata = {
  title: "ConnectMe - Unified Omnichannel Inbox",
  description: "Unified Inbox for WhatsApp, Messenger, Instagram, Telegram & Discord",
  applicationName: "ConnectMe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ConnectMe",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the inline script mutates <html> before React hydrates.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full bg-bg font-sans text-ink antialiased">
        <ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-in">
          <QueryProvider>
            <PwaProvider>{children}</PwaProvider>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
