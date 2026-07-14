"use client";
import { motion, useReducedMotion } from "motion/react";

export function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .42, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.div>;
}
