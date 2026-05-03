import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";

const ptRootUi = localFont({
  src: [
    {
      path: "../public/fonts/pt-root-ui-light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/pt-root-ui-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/pt-root-ui-medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/pt-root-ui-bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "808 Демок",
  description: "Подбери сценарий перезапуска для зависшей демки",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={ptRootUi.variable}>
      <body>{children}</body>
    </html>
  );
}
