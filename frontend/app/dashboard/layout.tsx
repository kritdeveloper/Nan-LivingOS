import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curator Dashboard | Nan Living OS",
  description: "Overview of knowledge stewardship, impact, and moderation for Nan Living OS.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
