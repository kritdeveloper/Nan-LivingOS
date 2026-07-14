"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, CircleGauge, Leaf, Route, Sparkles, Target } from "lucide-react";
import { api } from "./utils/api";
import type { GraphEntity } from "./types";
import { LanguageSwitch, useLocale } from "./components/LocaleProvider";
import { Reveal } from "./components/Reveal";

export default function Home() {
  const { entityName } = useLocale();
  const [stories, setStories] = useState<GraphEntity[]>([]);
  useEffect(() => { api.searchEntities({ limit: 6 }).then((result) => setStories(result.items)).catch(() => setStories([])); }, []);

  return <main className="page-shell overflow-hidden">
    <nav className="glass sticky top-0 z-40 mx-auto flex min-h-[74px] items-center gap-4 px-4 sm:px-7">
      <Link href="/" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full font-semibold" style={{ background: "var(--forest)", color: "var(--canvas)" }}>น</span><strong className="text-sm tracking-[.16em]">NAN FLOW</strong></Link>
      <div className="ml-auto hidden items-center gap-7 md:flex">{[["/stories","Stories"],["/journey","Impact Journey"],["/community","Community"],["/dashboard","Province"]].map(([href,label]) => <Link className="text-xs font-bold" style={{ color: "var(--muted)" }} href={href} key={href}>{label}</Link>)}</div>
      <div className="ml-auto flex items-center gap-2 md:ml-4"><LanguageSwitch /><Link href="/journey" className="primary-button hidden sm:inline-flex">เริ่ม Journey <ArrowRight size={15} /></Link></div>
    </nav>

    <section className="relative mx-auto grid min-h-[720px] max-w-[1500px] items-center gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-12">
      <div className="absolute left-[8%] top-[12%] -z-0 size-[420px] rounded-full opacity-25 blur-3xl" style={{ background: "var(--mint)" }} />
      <Reveal className="relative z-10">
        <p className="eyebrow flex items-center gap-2"><Sparkles size={14} /> AI Decision Intelligence for Sustainable Tourism</p>
        <h1 className="display-title mt-7">เพิ่มคุณค่า<br /><span style={{ color: "var(--mint)" }}>ไม่เพิ่มปริมาณ</span></h1>
        <p className="body-copy mt-7 max-w-xl text-lg">เปลี่ยนองค์ความรู้ ความพร้อมของชุมชน และสัญญาณการท่องเที่ยว ให้เป็นการตัดสินใจที่กระจายโอกาสตลอด 12 เดือน</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href="/journey" className="primary-button">ออกแบบการเดินทาง <ArrowRight size={16} /></Link><Link href="/stories" className="secondary-button"><BookOpen size={17} /> เริ่มจากเรื่องราว</Link></div>
        <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-xs font-bold" style={{ color: "var(--tertiary)" }}><span>Stories before places</span><span>Communities before attractions</span><span>Impact before features</span></div>
      </Reveal>

      <Reveal delay={.12} className="relative z-10">
        <div className="glass rounded-[32px] p-5 sm:p-7">
          <div className="flex items-start justify-between"><div><p className="eyebrow">Provincial flow</p><h2 className="section-title mt-2">น่านในเดือนนี้</h2></div><span className="chip chip-active"><span className="status-dot bg-white" /> Live</span></div>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[{label:"องค์ความรู้",value:"38",icon:BookOpen},{label:"จุด GPS จริง",value:"13",icon:Route},{label:"ความพร้อม",value:"12 เดือน",icon:CalendarDays},{label:"หลักฐานอ้างอิง",value:"66",icon:CircleGauge}].map(({label,value,icon:Icon}) => <div className="soft-card" key={label}><Icon size={18} style={{ color: "var(--mint)" }} /><strong className="metric-value mt-5 block">{value}</strong><span className="mt-1 block text-xs" style={{ color: "var(--tertiary)" }}>{label}</span></div>)}
          </div>
          <div className="mt-4 rounded-3xl p-5" style={{ background: "var(--forest)", color: "var(--canvas)" }}><div className="flex items-center gap-3"><Leaf size={20} /><div><p className="text-sm font-bold">Value before volume</p><p className="mt-1 text-xs opacity-70">ให้ AI ช่วยกระจายคุณค่า ไม่ใช่เร่งจำนวนคน</p></div></div></div>
        </div>
      </Reveal>
    </section>

    <section className="mx-auto max-w-[1500px] px-5 pb-24 lg:px-12">
      <div className="flex items-end justify-between gap-5"><div><p className="eyebrow">Living knowledge</p><h2 className="page-title mt-3">เรื่องราวนำทางการเดินทาง</h2></div><Link href="/stories" className="secondary-button hidden sm:inline-flex">ดูทั้งหมด <ArrowRight size={15} /></Link></div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{stories.slice(0,3).map((story,index) => <Reveal delay={index*.06} key={story.id}><Link href="/stories" className="group block min-h-[300px] rounded-[28px] border p-6 transition hover:-translate-y-1" style={{ background: index===0 ? "var(--forest)" : "var(--surface)", color: index===0 ? "var(--canvas)" : "var(--text)", borderColor: "var(--line)" }}><span className="eyebrow opacity-70">{story.labels[0] || "Knowledge"}</span><h3 className="mt-16 text-2xl font-medium" style={{ fontFamily: "Georgia, serif" }}>{entityName(story)}</h3><p className="mt-4 line-clamp-3 text-sm leading-6 opacity-65">{story.description || "เรื่องราวที่เชื่อมโยงผู้คน ชุมชน และภูมิทัศน์ของน่าน"}</p><span className="mt-7 inline-flex items-center gap-2 text-xs font-bold">สำรวจความสัมพันธ์ <ArrowRight className="transition group-hover:translate-x-1" size={14} /></span></Link></Reveal>)}</div>
    </section>

    <section className="border-y" style={{ borderColor: "var(--line)", background: "var(--surface)" }}><div className="mx-auto max-w-[1500px] px-5 py-16 lg:px-12"><p className="eyebrow">One system · Three connected views</p><h2 className="section-title mt-3">ระบบเดียวสำหรับนักท่องเที่ยว ชุมชน และจังหวัด</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{[{icon:Route,title:"Tourist View",text:"ได้รับประสบการณ์ที่เหมาะกับตนเองและสร้างผลกระทบเชิงบวก",href:"/journey"},{icon:Target,title:"Community View",text:"กำหนด Community Need, Capacity, Consent และสิทธิ์ในการหยุด",href:"/community"},{icon:CircleGauge,title:"Province View",text:"ใช้ AI กระจายคน รายได้ และโอกาสตลอด 12 เดือน",href:"/dashboard"}].map(({icon:Icon,title,text,href}) => <Link href={href} className="soft-card group" key={title}><Icon size={21} style={{ color: "var(--mint)" }} /><h3 className="mt-7 text-xl font-bold">{title}</h3><p className="body-copy mt-3 text-sm">{text}</p><ArrowRight className="mt-6 transition group-hover:translate-x-1" size={16} /></Link>)}</div></div></section>
  </main>;
}
