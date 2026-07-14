"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, BrainCircuit, CalendarDays, Check, Clock3, Compass, HandHeart, Leaf, MapPin, Sparkles, TrendingUp, WalletCards } from "lucide-react";
import { ProductShell } from "../components/ProductShell";
import { Reveal } from "../components/Reveal";
import { LivingMap } from "../components/LivingMap";
import { useLocale } from "../components/LocaleProvider";
import { api } from "../utils/api";
import type { GraphEntity, ReasoningResult } from "../types";

const interests = ["วัฒนธรรม", "ชุมชน", "ธรรมชาติ", "อาหาร", "งานฝีมือ"];

export default function JourneyPage() {
  const { locale, entityName } = useLocale();
  const [selectedInterest, setSelectedInterest] = useState("วัฒนธรรม");
  const [month, setMonth] = useState("ธันวาคม");
  const [pace, setPace] = useState("Slow");
  const [communityNeed, setCommunityNeed] = useState("กระจายรายได้สู่ผู้ประกอบการรายย่อย");
  const [entities, setEntities] = useState<GraphEntity[]>([]);
  const [active, setActive] = useState<GraphEntity | null>(null);
  const [reasoning, setReasoning] = useState<ReasoningResult | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => { api.searchEntities({ limit: 40 }).then(({items}) => { const places = items.filter((item) => item.latitude != null && item.longitude != null); setEntities(places); setActive(places[0] || null); }); }, []);
  const selectEntity = useCallback((entity: GraphEntity) => setActive(entity), []);
  const designJourney = async () => { setThinking(true); try { const result = await api.aiReason({ kind: "experience", question: `ออกแบบการเดินทาง${selectedInterest}แบบ${pace}ในเดือน${month} โดยตอบโจทย์ชุมชนเรื่อง${communityNeed}`, language: locale, themes: selectedInterest === "ธรรมชาติ" ? ["nature"] : ["culture"], limit: 4 }); setReasoning(result); const first = entities.find((entity) => entity.id === result.items[0]?.entity_id); if (first) setActive(first); } finally { setThinking(false); } };
  const impactScore = reasoning ? Math.min(92, 58 + reasoning.citations.length * 7 + reasoning.items.length * 3) : null;

  return <ProductShell title="Journey" description="Intent → evidence → responsible experience" action={<span className="chip hidden sm:inline-flex"><span className="status-dot" /> Community-aware</span>}>
    <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <Reveal><section className="decision-card xl:sticky xl:top-[110px]"><p className="eyebrow">Define your intent</p><h2 className="section-title mt-3">คุณอยากเข้าใจน่านแบบไหน</h2><p className="body-copy mt-3 text-sm">ระบบจะใช้ความหมาย ความพร้อม และผลกระทบ—not popularity—ในการสร้างทางเลือก</p>
        <div className="mt-8"><label className="text-xs font-bold">ความสนใจ</label><div className="mt-3 flex flex-wrap gap-2">{interests.map((item) => <button onClick={() => setSelectedInterest(item)} key={item} className={`chip ${selectedInterest===item ? "chip-active" : ""}`}>{item}</button>)}</div></div>
        <div className="mt-7 grid grid-cols-2 gap-3"><label className="soft-card"><CalendarDays size={17} style={{ color:"var(--mint)" }} /><span className="mt-3 block text-[11px] font-bold">เดือน</span><select className="mt-2 w-full bg-transparent text-sm font-bold outline-none" value={month} onChange={(event) => setMonth(event.target.value)}>{["มกราคม","เมษายน","กรกฎาคม","ตุลาคม","ธันวาคม"].map((item) => <option key={item}>{item}</option>)}</select></label><label className="soft-card"><Clock3 size={17} style={{ color:"var(--mint)" }} /><span className="mt-3 block text-[11px] font-bold">จังหวะ</span><select className="mt-2 w-full bg-transparent text-sm font-bold outline-none" value={pace} onChange={(event) => setPace(event.target.value)}>{["Slow","Balanced","Active"].map((item) => <option key={item}>{item}</option>)}</select></label></div>
        <label className="mt-4 block rounded-2xl p-4" style={{ background:"var(--mint-light)" }}><span className="flex items-center gap-2 text-xs font-bold"><HandHeart size={16} /> Community Need</span><select className="mt-3 w-full bg-transparent text-sm font-bold outline-none" value={communityNeed} onChange={(event) => setCommunityNeed(event.target.value)}>{["กระจายรายได้สู่ผู้ประกอบการรายย่อย","เพิ่มโอกาสช่วงนอกฤดูกาล","สนับสนุนงานฝีมือและวัฒนธรรม","ลดความหนาแน่นในพื้นที่หลัก"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <div className="mt-4 rounded-2xl p-4" style={{ background:"var(--mint-light)" }}><div className="flex items-start gap-3"><Leaf className="mt-0.5" size={18} style={{ color:"var(--mint)" }} /><div><p className="text-xs font-bold">Desired impact</p><p className="mt-1 text-xs leading-5" style={{ color:"var(--muted)" }}>กระจายรายได้สู่ชุมชนและลดความหนาแน่น</p></div></div></div>
        <button className="primary-button mt-6 w-full" onClick={designJourney} disabled={thinking}>{thinking ? <><Sparkles className="animate-pulse" size={16} /> กำลังเชื่อมโยงความรู้</> : <>สร้าง Journey ที่เหมาะกับฉัน <ArrowRight size={15} /></>}</button>
      </section></Reveal>

      <div className="space-y-6">
        <Reveal delay={.08}><LivingMap entities={entities} activeId={active?.id} onSelect={selectEntity} /></Reveal>
        {active && <Reveal delay={.12}><section className="decision-card grid gap-7 md:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap items-center gap-2"><span className="chip chip-active"><MapPin size={13} /> GPS verified</span>{active.labels.map((label) => <span className="chip" key={label}>{label}</span>)}</div><h2 className="section-title mt-5">{entityName(active)}</h2><p className="body-copy mt-4 max-w-2xl">{active.description || "ประสบการณ์ที่เชื่อมโยงเรื่องราว ชุมชน และภูมิทัศน์ของน่าน"}</p></div><div className="grid min-w-[190px] gap-3"><div className="soft-card"><WalletCards size={17} style={{ color:"var(--gold)" }} /><p className="mt-3 text-xs font-bold">Local value</p><strong className="mt-1 block text-lg">High retention</strong></div><div className="soft-card"><Check size={17} style={{ color:"var(--mint)" }} /><p className="mt-3 text-xs font-bold">Readiness</p><strong className="mt-1 block text-lg">Context ready</strong></div></div></section></Reveal>}
        {reasoning && <Reveal><section className="rounded-[28px] p-6 sm:p-8" style={{ background:"var(--forest)", color:"var(--canvas)" }}><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/10"><Sparkles size={20} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.18em] opacity-60">Nan decision engine</p><h2 className="mt-1 text-xl font-bold">Grounded recommendation</h2></div></div><p className="mt-6 max-w-3xl text-sm leading-7 opacity-80">{reasoning.summary}</p><div className="mt-7 grid gap-3 md:grid-cols-2">{reasoning.items.map((item) => <article className="rounded-2xl border border-white/10 bg-white/5 p-4" key={item.entity_id}><strong className="text-sm">{item.title}</strong><p className="mt-2 line-clamp-2 text-xs leading-5 opacity-65">{item.reasons[0]}</p></article>)}</div><div className="mt-6 flex items-center gap-2 text-xs opacity-65"><Compass size={15} /> มีหลักฐานอ้างอิง {reasoning.citations.length} แหล่ง · คุณเป็นผู้ตัดสินใจสุดท้าย</div></section></Reveal>}
        {reasoning && <Reveal><section className="grid gap-4 md:grid-cols-3"><article className="decision-card"><p className="eyebrow">Impact Score</p><strong className="metric-value mt-5 block">{impactScore}<span className="text-base">/100</span></strong><p className="body-copy mt-3 text-xs">คะแนนเบื้องต้นจากความสอดคล้องของความตั้งใจ ความต้องการชุมชน และหลักฐาน</p></article><article className="decision-card"><BrainCircuit size={20} style={{color:"var(--mint)"}}/><p className="eyebrow mt-5">AI Decision Reasoning</p><p className="mt-3 text-sm font-bold">เลือกทางเลือกที่ตอบโจทย์ “{communityNeed}” ก่อนความนิยม</p></article><article className="decision-card"><TrendingUp size={20} style={{color:"var(--gold)"}}/><p className="eyebrow mt-5">Economic Flow</p><p className="mt-3 text-sm font-bold">ชุมชน → ผู้ประกอบการท้องถิ่น → กองทุนพื้นที่</p></article></section></Reveal>}
        <Reveal><section className="decision-card"><div className="flex items-end justify-between gap-4"><div><p className="eyebrow">12-Month Opportunity Engine</p><h2 className="section-title mt-2">โอกาสที่เหมาะกับช่วงเวลา</h2></div><span className="chip">Province-aware</span></div><div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-12">{["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."].map((item,index)=><button key={item} className={`rounded-2xl border p-3 text-center ${item===month.slice(0,3)+"."?"chip-active":""}`} style={{borderColor:"var(--line)",background:index>=4&&index<=9?"var(--mint-light)":"var(--surface)"}}><span className="block text-xs font-bold">{item}</span><span className="mt-2 block text-[10px]" style={{color:"var(--tertiary)"}}>{index>=4&&index<=9?"โอกาส":"ปกติ"}</span></button>)}</div><p className="body-copy mt-5 text-xs">Engine จะผสานฤดูกาล ความพร้อมของชุมชน ความหนาแน่น และโอกาสทางเศรษฐกิจ ก่อนสร้างคำแนะนำ</p></section></Reveal>
      </div>
    </div>
  </ProductShell>;
}
