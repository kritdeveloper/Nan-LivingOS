import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stories | NAN FLOW",
  description: "Browse the living archives, stories, traditions, and landscapes of Nan province.",
};

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
