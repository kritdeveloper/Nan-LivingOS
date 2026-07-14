"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CircleDollarSign, HeartHandshake, Leaf, Scale, ShieldCheck, Users } from "lucide-react";
import { ProductShell } from "../components/ProductShell";
import { Reveal } from "../components/Reveal";

const metrics = [
  { label:"Local value retained", value:"78%", change:"+12%", icon:CircleDollarSign, tone:"var(--gold)" },
  { label:"Months activated", value:"9/12", change:"+3", icon:Leaf, tone:"var(--mint)" },
  { label:"Beneficiary diversity", value:"24", change:"+8", icon:Users, tone:"var(--river)" },
  { label:"Community confidence", value:"High", change:"Stable", icon:HeartHandshake, tone:"var(--clay)" },
];

export default function ImpactPage() {
  return <ProductShell title="Impact" description="Value distribution, evidence and accountability" action={<button className="secondary-button hidden sm:inline-flex"><Scale size={16} /> เปรียบเทียบเดือน</button>}>
    <Reveal><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow">Impact before features</p><h2 className="page-title mt-3 max-w-3xl">การเดินทางสร้างคุณค่าให้ใคร และใครเป็นผู้รับต้นทุน</h2><p className="body-copy mt-4 max-w-2xl">แยกผลกระทบทางเศรษฐกิจ สังคม วัฒนธรรม และสิ่งแวดล้อม โดยไม่ซ่อนความจริงไว้หลังคะแนนเดียว</p></div><span className="chip chip-active"><ShieldCheck size={14} /> Evidence verified</span></div></Reveal>

    <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(({label,value,change,icon:Icon,tone},index) => <Reveal delay={index*.05} key={label}><article className="soft-card"><div className="flex items-start justify-between"><span className="grid size-11 place-items-center rounded-2xl" style={{ background:`color-mix(in srgb, ${tone} 15%, transparent)`, color:tone }}><Icon size={20} /></span><span className="flex items-center gap-1 text-xs font-bold" style={{ color:"var(--mint)" }}>{change.startsWith("+") ? <ArrowUpRight size={14} /> : null}{change}</span></div><strong className="metric-value mt-8 block">{value}</strong><p className="mt-2 text-xs font-bold" style={{ color:"var(--muted)" }}>{label}</p></article></Reveal>)}</div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <Reveal><section className="decision-card"><div className="flex items-start justify-between"><div><p className="eyebrow">Economic flow</p><h2 className="section-title mt-2">การกระจายคุณค่าท้องถิ่น</h2></div><CircleDollarSign style={{ color:"var(--gold)" }} /></div><div className="mt-8 space-y-6">{[{label:"Community hosts",value:34,color:"var(--mint)"},{label:"Local businesses",value:28,color:"var(--river)"},{label:"Local producers",value:16,color:"var(--gold)"},{label:"Conservation fund",value:8,color:"var(--clay)"},{label:"External leakage",value:14,color:"var(--tertiary)"}].map(({label,value,color}) => <div key={label}><div className="flex justify-between text-xs font-bold"><span>{label}</span><span>{value}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background:"var(--line)" }}><div className="h-full rounded-full" style={{ width:`${value}%`, background:color }} /></div></div>)}</div><div className="mt-8 rounded-2xl p-4" style={{ background:"var(--mint-light)" }}><p className="text-xs font-bold">Interpretation</p><p className="mt-2 text-xs leading-5" style={{ color:"var(--muted)" }}>มูลค่าส่วนใหญ่คงอยู่ในจังหวัด แต่ยังมีโอกาสลด leakage ผ่านการเชื่อม local transport และผู้ผลิตในพื้นที่</p></div></section></Reveal>

      <Reveal delay={.08}><section className="decision-card h-full"><p className="eyebrow">Threshold status</p><h2 className="section-title mt-2">สมดุลระบบ</h2><div className="mt-8 space-y-3">{[{label:"Economic",status:"Within threshold",icon:ArrowUpRight,color:"var(--mint)"},{label:"Social workload",status:"Monitor",icon:ArrowRight,color:"var(--warning)"},{label:"Cultural pressure",status:"Within threshold",icon:ArrowRight,color:"var(--mint)"},{label:"Environmental load",status:"Adjust",icon:ArrowDownRight,color:"var(--warning)"}].map(({label,status,icon:Icon,color}) => <div className="surface flex items-center gap-3 rounded-2xl p-4" key={label}><span className="grid size-9 place-items-center rounded-xl" style={{ background:`color-mix(in srgb, ${color} 15%, transparent)`, color }}><Icon size={17} /></span><div><p className="text-xs font-bold">{label}</p><p className="mt-1 text-[11px]" style={{ color:"var(--tertiary)" }}>{status}</p></div></div>)}</div><button className="primary-button mt-7 w-full">ดูหลักฐานและการตอบสนอง <ArrowRight size={15} /></button></section></Reveal>
    </div>

    <Reveal><section className="mt-6 rounded-[28px] p-6 sm:p-8" style={{ background:"var(--forest)", color:"var(--canvas)" }}><div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] opacity-60">Learning loop</p><h2 className="mt-3 text-3xl font-medium" style={{ fontFamily:"Georgia,serif" }}>Impact must change the next decision.</h2></div><div className="grid gap-3 sm:grid-cols-3">{["Observe outcomes","Community validates","Rules adjust"].map((item,index) => <div className="rounded-2xl border border-white/10 bg-white/5 p-4" key={item}><span className="text-xs opacity-50">0{index+1}</span><p className="mt-8 text-sm font-bold">{item}</p></div>)}</div></div></section></Reveal>
  </ProductShell>;
}
