import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Journey | NAN FLOW",
  description: "Grounded AI decision intelligence for responsible journeys in Nan.",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
