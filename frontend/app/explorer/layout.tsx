import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore | Nan Living OS",
  description: "Browse the living archives, stories, traditions, and landscapes of Nan province.",
};

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
