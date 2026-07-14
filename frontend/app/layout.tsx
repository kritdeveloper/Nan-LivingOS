import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
