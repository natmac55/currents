import type { Metadata } from "next"
import { Fraunces, Source_Sans_3 } from "next/font/google"
import "./globals.css"

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
})

const sans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://127.0.0.1:47291")
  ),
  title: "Currents — RSS reader",
  description:
    "A personal RSS reader that pulls headlines from the sites you choose into one quiet timeline.",
  applicationName: "Currents",
  openGraph: {
    title: "Currents",
    description:
      "Pull headlines from the sites you choose — one river, no algorithm.",
    siteName: "Currents",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Currents — your quiet RSS river",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Currents",
    description:
      "Pull headlines from the sites you choose — one river, no algorithm.",
    images: ["/og.jpg"],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  )
}
