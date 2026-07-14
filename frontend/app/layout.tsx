import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "./components/LocaleProvider";

export const metadata: Metadata = {
  title: { default: "NAN FLOW", template: "%s — NAN FLOW" },
  description: "AI Decision Intelligence Platform for Sustainable Tourism in Nan.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark" suppressHydrationWarning>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
