import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Graph | Nan Living OS",
  description: "Explore connections between places, traditions, and historical entities in Nan.",
};

export default function GraphLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
