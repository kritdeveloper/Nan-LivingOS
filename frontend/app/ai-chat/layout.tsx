import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask Nan OS | Nan Living OS",
  description: "Ground-truth AI Reasoning Engine for exploring Nan's local culture.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
