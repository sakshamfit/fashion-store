import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./responsive.css";
import { StoreProvider } from "@/components/store/provider";

export const metadata: Metadata = {
  title: { default: "VYRN — Independent expression", template: "%s | VYRN" },
  description:
    "Modern essentials. Independent expression. Explore the VYRN collection, studio and new-season stories.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};

// Keep pinch-to-zoom available, and account for iPhone notches/home indicators.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fbfbfa",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/manrope-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body id="top">
        <noscript>
          <style>{`.brand-opening{display:none!important}.hero,.hero *{animation:none!important}.header{opacity:1!important}`}</style>
        </noscript>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
