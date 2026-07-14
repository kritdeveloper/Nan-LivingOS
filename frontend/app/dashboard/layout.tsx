import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | NAN FLOW",
  description: "Prioritized tourism decisions, impact signals, and grounded evidence.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
