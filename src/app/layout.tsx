import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Noto_Serif } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

const sans = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const serif = Noto_Serif({
  variable: "--font-serif",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KES Ops",
  description: "Quản lý đơn hàng, chi phí và lợi nhuận cho KES Cafe.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#efe6d8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
