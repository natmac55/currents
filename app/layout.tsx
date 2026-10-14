import type { Metadata } from "next";
import { Fraunces, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl =
  process.env.SITE_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:47291";

export const metadata: Metadata = {
  title: {
    default: "Field Notes",
    template: "%s · Field Notes",
  },
  description:
    "Short engineering notes on shipping small, dated surfaces — with an RSS feed that mirrors every post.",
  metadataBase: new URL(siteUrl),
  alternates: {
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body text-ink">{children}</body>
    </html>
  );
}
