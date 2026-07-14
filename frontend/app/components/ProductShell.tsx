"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, CircleGauge, Compass, Leaf, Menu, Moon, Route, Settings, Sun, Users, X } from "lucide-react";
import { LanguageSwitch, useLocale } from "./LocaleProvider";

const navigation = [
  { href: "/stories", label: "Stories", icon: BookOpen },
  { href: "/journey", label: "Journey", icon: Route },
  { href: "/community", label: "Community", icon: Users },
  { href: "/impact", label: "Impact", icon: Leaf },
  { href: "/dashboard", label: "Dashboard", icon: CircleGauge },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ProductShell({ children, title, description, action }: { children: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  const path = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("dark", saved === "dark");
  }, []);

  useEffect(() => { setOpen(false); }, [path]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  return (
    <div className="page-shell lg:grid lg:grid-cols-[280px_1fr]">
      <button aria-label="Close navigation" className={`fixed inset-0 z-40 bg-black/50 transition lg:hidden ${open ? "visible opacity-100" : "invisible opacity-0"}`} onClick={() => setOpen(false)} />
      <aside id="primary-navigation" className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r p-5 transition duration-300 lg:sticky lg:top-0 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3" aria-label="NAN FLOW Home">
            <span className="grid size-11 place-items-center rounded-full text-xl font-semibold" style={{ background: "var(--forest)", color: "var(--canvas)" }}>น</span>
            <span><strong className="block text-sm tracking-[.16em]">NAN FLOW</strong><small className="text-[10px]" style={{ color: "var(--tertiary)" }}>Decision intelligence</small></span>
          </Link>
          <button className="icon-button lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <p className="eyebrow mb-3 mt-10 px-3">{t("Discover")}</p>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return <Link href={href} key={href} className="flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition" style={{ background: active ? "var(--mint-light)" : "transparent", color: active ? "var(--forest)" : "var(--muted)" }}><Icon size={18} /><span>{t(label)}</span>{active && <ChevronRight className="ml-auto" size={16} />}</Link>;
          })}
        </nav>
        <div className="mt-auto rounded-3xl p-5" style={{ background: "var(--forest)", color: "var(--canvas)" }}>
          <Compass size={20} />
          <p className="mt-4 text-sm font-bold">12 months, one living province.</p>
          <p className="mt-2 text-xs leading-5 opacity-70">เพิ่มคุณค่าการเดินทาง โดยไม่เพิ่มภาระให้ชุมชน</p>
          <Link href="/journey" className="mt-4 inline-flex items-center gap-2 text-xs font-bold">{t("Start a journey")} <ChevronRight size={14} /></Link>
        </div>
      </aside>
      <main className="min-w-0">
        <header className="glass sticky top-0 z-30 flex min-h-[82px] items-center gap-3 px-4 sm:px-6 lg:px-10">
          <button className="icon-button lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation" aria-expanded={open} aria-controls="primary-navigation"><Menu size={19} /></button>
          <div className="min-w-0"><p className="eyebrow">NAN FLOW</p><h1 className="truncate text-xl font-semibold tracking-[-.025em] sm:text-2xl">{t(title)}</h1>{description && <p className="hidden text-xs sm:block" style={{ color: "var(--tertiary)" }}>{description}</p>}</div>
          <div className="ml-auto flex items-center gap-2">{action}<LanguageSwitch /><button className="icon-button" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button></div>
        </header>
        <div className="content-wrap">{children}</div>
      </main>
    </div>
  );
}
