import type { Metadata } from "next";
import "@/styles/globals.css";
import { Outfit, Bebas_Neue } from "next/font/google";
import Providers from "./providers";
import {
  SITE_NAME,
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_SHORT,
  SITE_KEYWORDS,
  getSiteUrl,
} from "@/lib/seo/site";

const outfit = Outfit({
    variable: "--font-outfit",
    weight: [
        "100","200","300","400","500","600","700","800","900"
    ],
    subsets: ["latin"],
    display: "swap",
});

const bebasNeue = Bebas_Neue({
    variable: "--font-bebas-neue",
    weight: ["400"],
    subsets: ["latin"],
    display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${SITE_NAME} — ${SITE_DESCRIPTION_SHORT}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME, url: getSiteUrl() }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    url: getSiteUrl(),
    title: `${SITE_NAME} — ${SITE_DESCRIPTION_SHORT}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/favicons/genfavicon-512.png",
        width: 512,
        height: 512,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_DESCRIPTION_SHORT}`,
    description: SITE_DESCRIPTION,
    images: ["/favicons/genfavicon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: "/favicons/favicon.ico" },
      { url: "/favicons/genfavicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicons/genfavicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicons/genfavicon-180.png", sizes: "180x180", type: "image/png" },
      { url: "/favicons/genfavicon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/favicons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
          className={`${outfit.variable} ${bebasNeue.variable} antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
