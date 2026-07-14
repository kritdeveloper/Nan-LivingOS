import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Impact Journey | NAN FLOW",
  description: "Turn traveler intent and community needs into measurable provincial impact.",
};

export default function ExplorerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
