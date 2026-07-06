import type { Metadata, Viewport } from "next";
import { fontSans, fontMono } from "@/lib/fonts";
import { Providers } from "@/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "AI workflows",
    "automation",
    "AI agents",
    "pipeline orchestration",
    "SaaS",
    "ForgeFlow",
  ],
  authors: [...siteConfig.authors],
  creator: "ForgeFlow AI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
    creator: "@forgeflowai",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d18" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontSans.variable} ${fontMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="h-full antialiased font-sans">
        <Providers>
          <TooltipProvider delay={300}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
