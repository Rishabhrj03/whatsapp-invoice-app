import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://primebake.anewway.in"),
  title: "Primebake",
  description: "Primebake — Premium Digital Invoicing & POS Platform",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://primebake.anewway.in",
    siteName: "Primebake",
    title: "Primebake",
    description: "Primebake — Premium Digital Invoicing & POS Platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Primebake — Raw Material & Bakery Supplies",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Primebake",
    description: "Primebake — Premium Digital Invoicing & POS Platform",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Primebake",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/primebake-logo.png', type: 'image/png' },
    ],
    shortcut: '/primebake-logo.png',
    apple: '/primebake-logo.png',
  },
};

export const viewport = {
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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
