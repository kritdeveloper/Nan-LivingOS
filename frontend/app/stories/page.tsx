"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Filter, Quote, Search, ShieldCheck } from "lucide-react";
import { ProductShell } from "../components/ProductShell";
import { Reveal } from "../components/Reveal";
import { useLocale } from "../components/LocaleProvider";
import { api } from "../utils/api";
import type { GraphEntity, KnowledgeSource } from "../types";

const categories = ["All", "Place", "Community", "CulturalHeritage", "StarterExperience"];

export default function StoriesPage() {
  const { entityName } = useLocale();
  const [items, setItems] = useState<GraphEntity[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState<GraphEntity | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setLoading(true); api.searchEntities({ q: query || undefined, labels: category === "All" ? undefined : [category], limit: 40 }).then(({items}) => { setItems(items); setSelected((current) => current && items.some((item) => item.id === current.id) ? current : items[0] || null); }).finally(() => setLoading(false)); }, [query, category]);
  useEffect(() => { if (!selected) return setSources([]); api.getEntitySources(selected.id).then(({items}) => setSources(items)).catch(() => setSources([])); }, [selected]);
  const featured = useMemo(() => selected || items[0], [selected, items]);

  return <ProductShell title="Stories" description="Grounded knowledge, owned by communities">
    <Reveal><div className="grid gap-7 lg:grid-cols-[1fr_360px]">
      <section>
        <p className="eyebrow">Stories before places</p><h2 className="page-title mt-3">ค้นพบน่านผ่านความหมาย</h2><p className="body-copy mt-4 max-w-2xl">เรื่องราวทุกชิ้นเชื่อมโยงกับเจ้าของความรู้ ฤดูกาล พื้นที่ และหลักฐานที่ตรวจสอบได้</p>
        <div className="surface mt-8 flex min-h-14 items-center gap-3 rounded-2xl px-4"><Search size={18} style={{ color: "var(--tertiary)" }} /><input className="w-full bg-transparent text-sm outline-none" placeholder="ค้นหาเรื่องราวด้วยความหมาย..." value={query} onChange={(event) => setQuery(event.target.value)} /><Filter size={17} style={{ color: "var(--tertiary)" }} /></div>
        <div className="mt-4 flex gap-2 overflow-auto pb-2">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`chip ${category === item ? "chip-active" : ""}`}>{item}</button>)}</div>
      </section>
      <aside className="rounded-[28px] p-6" style={{ background: "var(--mint-light)" }}><ShieldCheck size={20} style={{ color: "var(--mint)" }} /><h3 className="mt-5 font-bold">Knowledge trust</h3><p className="body-copy mt-2 text-sm">แยกข้อมูลชุมชน ข้อเท็จจริง และการตีความของ AI พร้อมรักษาแหล่งอ้างอิง</p></aside>
    </div></Reveal>

    {loading ? <div className="mt-10 grid gap-4 md:grid-cols-3">{[1,2,3].map((i) => <div className="h-72 animate-pulse rounded-[28px]" style={{ background: "var(--surface)" }} key={i} />)}</div> : <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="grid gap-4 md:grid-cols-2">{items.map((item,index) => <Reveal delay={Math.min(index*.025,.2)} key={item.id}><button onClick={() => setSelected(item)} className="group flex min-h-[270px] w-full flex-col rounded-[28px] border p-6 text-left transition hover:-translate-y-1" style={{ background: selected?.id === item.id ? "var(--forest)" : "var(--surface)", color: selected?.id === item.id ? "var(--canvas)" : "var(--text)", borderColor: "var(--line)" }}><span className="eyebrow opacity-70">{item.labels.join(" · ")}</span><Quote className="mt-8" size={22} style={{ color: "var(--gold)" }} /><h3 className="mt-5 text-xl font-semibold" style={{ fontFamily: "Georgia, serif" }}>{entityName(item)}</h3><p className="mt-3 line-clamp-3 text-sm leading-6 opacity-65">{item.description || "องค์ความรู้ที่เชื่อมโยงกับผู้คนและพื้นที่ของน่าน"}</p><span className="mt-auto flex items-center gap-2 pt-6 text-xs font-bold">ดูบริบท <ArrowRight size={14} /></span></button></Reveal>)}</section>
      {featured && <aside className="lg:sticky lg:top-[110px] lg:h-fit"><div className="decision-card"><p className="eyebrow">Knowledge context</p><BookOpen className="mt-8" size={28} style={{ color: "var(--mint)" }} /><h2 className="section-title mt-5">{entityName(featured)}</h2><p className="body-copy mt-4">{featured.description || "ยังไม่มีคำอธิบายเพิ่มเติม"}</p><div className="mt-6 flex flex-wrap gap-2">{featured.labels.map((label) => <span className="chip" key={label}>{label}</span>)}</div><div className="mt-7 border-t pt-6" style={{ borderColor: "var(--line)" }}><p className="eyebrow">Sources · {sources.length}</p>{sources.slice(0,3).map((source) => <a className="mt-3 block text-xs font-bold leading-5" href={source.url} target="_blank" rel="noreferrer" key={source.id}>{source.title} <span style={{ color: "var(--tertiary)" }}>↗</span></a>)}</div><Link href="/journey" className="primary-button mt-7 w-full">สำรวจประสบการณ์ที่เชื่อมโยง <ArrowRight size={15} /></Link></div></aside>}
    </div>}
  </ProductShell>;
}
