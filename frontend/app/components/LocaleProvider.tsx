"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { GraphEntity } from "../types";

export type Locale = "th" | "en";

const th: Record<string, string> = {
  "Explorer": "สำรวจ",
  "Knowledge Graph": "กราฟความรู้",
  "AI Chat": "ผู้ช่วยความรู้",
  "Community": "ชุมชน",
  "Dashboard": "แดชบอร์ด",
  "Map": "แผนที่",
  "Discover": "ค้นพบ",
  "Explore Nan": "สำรวจน่าน",
  "Living archive": "คลังความรู้มีชีวิต",
  "Living Map": "แผนที่มีชีวิต",
  "Explore by place": "สำรวจผ่านพื้นที่",
  "Community Portal": "พื้นที่ชุมชน",
  "Shared by Nan": "เรื่องเล่าจากคนน่าน",
  "Curator Dashboard": "แดชบอร์ดผู้ดูแล",
  "Nan Living OS": "ระบบนิเวศความรู้น่าน",
  "Steward panel": "พื้นที่ผู้ดูแลความรู้",
  "Ask Nan OS": "ถาม Nan OS",
  "Knowledge assistant": "ผู้ช่วยเชื่อมโยงความรู้",
  "Connected memory": "ความทรงจำที่เชื่อมโยง",
  "All stories": "เรื่องราวทั้งหมด",
  "Places": "สถานที่",
  "Traditions": "ประเพณีและมรดก",
  "Seasons": "ฤดูกาล",
  "All themes": "ทุกหัวข้อ",
  "Culture": "วัฒนธรรม",
  "Nature": "ธรรมชาติ",
  "History": "ประวัติศาสตร์",
  "All Places": "ทุกพื้นที่",
  "Culture & Art": "วัฒนธรรมและศิลปะ",
  "Begin somewhere beautiful": "เริ่มต้นจากเรื่องราวที่งดงาม",
  "Explore story →": "อ่านเรื่องราว →",
  "Explore this place →": "สำรวจพื้นที่นี้ →",
  "From the community": "เรื่องเล่าจากชุมชน",
  "Share a memory": "แบ่งปันความทรงจำ",
  "Total Users": "ผู้ใช้งานทั้งหมด",
  "Knowledge Nodes": "องค์ความรู้",
  "Community Stories": "เรื่องราวชุมชน",
  "Pending Review": "รอตรวจสอบ",
  "Refresh Metrics": "อัปเดตข้อมูล",
  "What would you like to know?": "วันนี้คุณอยากรู้เรื่องอะไรเกี่ยวกับน่าน",
  "I connect stories, places, and local knowledge to help you understand Nan more deeply.": "ฉันเชื่อมโยงเรื่องราว พื้นที่ และภูมิปัญญาท้องถิ่น เพื่อช่วยให้คุณเข้าใจน่านอย่างลึกซึ้ง",
  "A living cultural intelligence": "ปัญญาวัฒนธรรมที่มีชีวิต",
  "Every place": "ทุกพื้นที่",
  "holds a": "เก็บรักษา",
  "memory.": "ความทรงจำ",
  "Discover the stories, people, and landscapes that make Nan more than a destination.": "ค้นพบเรื่องราว ผู้คน และภูมิทัศน์ที่ทำให้น่านเป็นมากกว่าจุดหมายปลายทาง",
  "Explore": "สำรวจ",
  "Knowledge": "องค์ความรู้",
  "Open map ↗": "เปิดแผนที่ ↗",
  "More ways to explore": "วิธีค้นพบน่านเพิ่มเติม",
  "Follow your curiosity.": "ออกเดินทางตามความอยากรู้",
  "Connecting knowledge, communities, and impact.": "เชื่อมโยงความรู้ ชุมชน และผลกระทบที่มีความหมาย",
  "Contributor dashboard →": "แดชบอร์ดผู้มีส่วนร่วม →",
  "Help memory live on": "ร่วมสืบต่อความทรงจำ",
  "Share a story, image, or piece of local knowledge.": "แบ่งปันเรื่องราว ภาพถ่าย หรือภูมิปัญญาท้องถิ่น",
  "Contribute →": "ร่วมแบ่งปัน →",
  "Researcher": "นักวิจัย",
  "Stories": "เรื่องราว",
  "Journey": "การเดินทาง",
  "Impact": "ผลกระทบ",
  "Settings": "การตั้งค่า",
  "Start a journey": "เริ่มออกแบบการเดินทาง",
  "Home": "หน้าหลัก",
  "Add knowledge": "เพิ่มองค์ความรู้",
  "No description available in the archives.": "ยังไม่มีคำอธิบายในคลังความรู้",
};

const placeholders: Record<string, string> = {
  "Search places, stories, traditions...": "ค้นหาสถานที่ เรื่องราว และประเพณี...",
  "Search the living memory of Nan (murals, salt, etc.)": "ค้นหาความทรงจำมีชีวิตของน่าน เช่น ภาพจิตรกรรม เกลือสินเธาว์",
  "Find a person, place, or idea (murals, Doi, etc.)": "ค้นหาผู้คน สถานที่ หรือแนวคิด",
  "Search the map...": "ค้นหาบนแผนที่...",
};

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: string) => string;
  entityName: (entity: GraphEntity) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("th");

  useEffect(() => {
    const saved = localStorage.getItem("nan-locale");
    setLocaleState(saved === "en" ? "en" : "th");
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem("nan-locale", next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: (text) => locale === "th" ? th[text] || text : text,
    entityName: (entity) => locale === "th" ? entity.nameTh : entity.nameEn || entity.nameTh,
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used within LocaleProvider");
  return value;
}

export function LanguageSwitch() {
  const { locale, setLocale } = useLocale();
  return (
    <div aria-label="Language" style={{ display: "flex", border: "1px solid var(--line)", borderRadius: "99px", padding: "2px" }}>
      {(["th", "en"] as const).map((item) => (
        <button key={item} onClick={() => setLocale(item)} aria-pressed={locale === item}
          style={{ border: 0, borderRadius: "99px", padding: "6px 9px", cursor: "pointer", fontSize: "10px", fontWeight: 700,
            background: locale === item ? "var(--mint)" : "transparent", color: locale === item ? "#102019" : "var(--muted)" }}>
          {item === "th" ? "ไทย" : "EN"}
        </button>
      ))}
    </div>
  );
}

export function localizedPlaceholder(value: string, locale: Locale) {
  return locale === "th" ? placeholders[value] || value : value;
}
