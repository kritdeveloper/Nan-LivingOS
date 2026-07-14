import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Living Map | Nan Living OS",
  description: "Explore stories, cultural sites, and heritage across the map of Nan province.",
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
