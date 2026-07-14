import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journey | NAN FLOW",
  description: "Explore stories, cultural sites, and heritage across the map of Nan province.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
