import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community | NAN FLOW",
  description: "Community ownership, readiness, knowledge, and shared value.",
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
