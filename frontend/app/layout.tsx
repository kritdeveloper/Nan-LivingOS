import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "./components/LocaleProvider";

export const metadata: Metadata = {
  title: "Nan Living OS",
  description: "Discover the living stories, people, and landscapes of Nan.",
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
    <html lang="th" className="dark">
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
