"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { LanguageSwitch, useLocale } from "./LocaleProvider";

const nav = [
  ["/explorer", "⌕", "Explorer"],
  ["/knowledge-graph", "◎", "Knowledge Graph"],
  ["/ai-chat", "✦", "AI Chat"],
  ["/community", "◌", "Community"],
  ["/dashboard", "▦", "Dashboard"],
  ["/map", "⌖", "Map"],
];

export function AppShell({
  title,
  kicker,
  children,
  action,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const path = usePathname();
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() =>
    typeof window === "undefined" ? "dark" : localStorage.getItem("theme") || "dark"
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    const html = document.documentElement;
    if (savedTheme === "light") {
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    const html = document.documentElement;
    if (nextTheme === "light") {
      html.classList.remove("dark");
      html.classList.add("light");
    } else {
      html.classList.remove("light");
      html.classList.add("dark");
    }
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="app-layout">
      <button
        className={`sidebar-backdrop ${open ? "visible" : ""}`}
        aria-label="Close navigation menu"
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />
      <aside className={`sidebar ${open ? "open" : ""}`} role="complementary">
        <Link href="/" className="brand" aria-label="Nan Living OS Home">
          <span className="brandmark">น</span>
          <span>NAN</span>
          <em>Living OS</em>
        </Link>
        <div className="side-label">{t("Discover")}</div>
        <nav aria-label="Main Navigation">
          {nav.map(([href, icon, label]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={path === href ? "active" : ""}
            >
              <span aria-hidden="true">{icon}</span>
              {t(label)}
            </Link>
          ))}
        </nav>
        <div className="side-spacer" />
        <div className="side-card">
          <span>✦</span>
          <b>{t("Help memory live on")}</b>
          <p style={{ margin: "5px 0 10px" }}>{t("Share a story, image, or piece of local knowledge.")}</p>
          <Link href="/community" style={{ color: "var(--mint)", fontWeight: "bold" }}>
            {t("Contribute →")}
          </Link>
        </div>
        <div className="profile">
          <span className="avatar">NP</span>
          <div>
            <b>Nicha P.</b>
            <small>{t("Researcher")}</small>
          </div>
          <button aria-label="User Options">•••</button>
        </div>
      </aside>
      
      <section className="app-main" role="main">
        <header className="app-header">
          <button
            className="menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
          >
            ☰
          </button>
          <div>
            <span className="label">{t(kicker)}</span>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: "26px", margin: "5px 0 0" }}>{t(title)}</h1>
          </div>
          <div className="header-action">
            {action}
            <LanguageSwitch />
            <button
              className="round"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              style={{ display: "grid", placeItems: "center", fontSize: "16px", cursor: "pointer" }}
            >
              {theme === "dark" ? "☼" : "☾"}
            </button>
            <button className="round notification" aria-label="Notifications">
              ◦
            </button>
          </div>
        </header>
        <div className="app-content">{children}</div>
      </section>
    </div>
  );
}
