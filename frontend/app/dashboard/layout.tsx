import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nan Mission Control | NAN FLOW",
  description: "AI provincial tourism control tower for missions, community impact, economic flow, and 12-month opportunity.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
