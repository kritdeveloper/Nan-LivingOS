import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community Portal | Nan Living OS",
  description: "Share local oral histories, photographs, and memories of Nan.",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
