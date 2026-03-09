import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "MedPhys Speed Quiz — Medical Physics Quiz & Exam Prep",
    template: "%s | MedPhys Speed Quiz",
  },
  description:
    "Free medical physics quiz app with 6000+ questions. Practice radiation therapy, diagnostic radiology, nuclear medicine, and health physics. Prepare for board exams with daily challenges, tournaments, and spaced repetition.",
  keywords: [
    "medical physics",
    "medical physics quiz",
    "radiation therapy exam",
    "diagnostic radiology quiz",
    "nuclear medicine questions",
    "health physics",
    "ABR exam prep",
    "CAMPEP",
    "radiation oncology physics",
    "medical physics board exam",
  ],
  metadataBase: new URL("https://medphysquiz.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MedPhys Speed Quiz — Medical Physics Quiz & Exam Prep",
    description:
      "Free medical physics quiz app with 6000+ questions covering radiation therapy, diagnostic radiology, nuclear medicine, and more.",
    url: "https://medphysquiz.com",
    siteName: "MedPhys Speed Quiz",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MedPhys Speed Quiz",
    description:
      "6000+ medical physics questions. Daily challenges, tournaments, and spaced repetition for board exam prep.",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MedPhys Quiz",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
