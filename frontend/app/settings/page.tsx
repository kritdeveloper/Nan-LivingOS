"use client";

import { useEffect, useState } from "react";
import { Bell, Bot, Check, Languages, LockKeyhole, Shield, UserRound } from "lucide-react";
import { ProductShell } from "../components/ProductShell";
import { Reveal } from "../components/Reveal";
import { useLocale } from "../components/LocaleProvider";

function Toggle({ checked, onChange, label }: { checked:boolean; onChange:(value:boolean)=>void; label:string }) {
  return <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="relative h-7 w-12 rounded-full transition" style={{ background:checked?"var(--mint)":"var(--line)" }}><span className="absolute top-1 size-5 rounded-full bg-white shadow transition" style={{ left:checked?"24px":"4px" }} /></button>;
}

export default function SettingsPage() {
  const { locale, setLocale } = useLocale();
  const [personalization,setPersonalization] = useState(true);
  const [impact,setImpact] = useState(true);
  const [notifications,setNotifications] = useState(true);
  const [saved,setSaved] = useState(false);
  useEffect(() => { setPersonalization(localStorage.getItem("nan-personalization") !== "false"); setImpact(localStorage.getItem("nan-impact-consent") !== "false"); }, []);
  const save = () => { localStorage.setItem("nan-personalization",String(personalization)); localStorage.setItem("nan-impact-consent",String(impact)); localStorage.setItem("nan-notifications",String(notifications)); setSaved(true); setTimeout(() => setSaved(false),2000); };

  return <ProductShell title="Settings" description="Consent, language and control" action={<button onClick={save} className="primary-button hidden sm:inline-flex">{saved?<><Check size={16}/> บันทึกแล้ว</>:"บันทึกการตั้งค่า"}</button>}>
    <Reveal><div><p className="eyebrow">Trust and control center</p><h2 className="page-title mt-3">คุณควบคุมข้อมูลและการตัดสินใจของคุณ</h2><p className="body-copy mt-4 max-w-2xl">การถอนความยินยอมต้องง่ายเท่ากับการให้ความยินยอม และ AI ต้องอธิบายว่าข้อมูลใดถูกนำไปใช้</p></div></Reveal>
    <div className="mt-9 grid gap-6 xl:grid-cols-[280px_1fr]"><Reveal><nav className="soft-card h-fit space-y-1">{[{icon:UserRound,label:"Account"},{icon:Languages,label:"Language"},{icon:Shield,label:"Privacy & data"},{icon:Bot,label:"AI controls"},{icon:Bell,label:"Notifications"},{icon:LockKeyhole,label:"Security"}].map(({icon:Icon,label},index) => <button key={label} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold" style={{ background:index===0?"var(--mint-light)":"transparent", color:index===0?"var(--forest)":"var(--muted)" }}><Icon size={17}/>{label}</button>)}</nav></Reveal>
      <div className="space-y-5"><Reveal delay={.05}><section className="decision-card"><div className="flex items-start gap-4"><span className="grid size-11 place-items-center rounded-2xl" style={{ background:"var(--mint-light)",color:"var(--mint)" }}><UserRound size={20}/></span><div><h3 className="text-lg font-bold">Account</h3><p className="mt-1 text-xs" style={{color:"var(--tertiary)"}}>Identity and effective permissions</p></div></div><div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Display name<input defaultValue="Nan Visitor" className="surface mt-2 min-h-12 w-full rounded-2xl px-4 outline-none"/></label><label className="text-xs font-bold">Active role<select className="surface mt-2 min-h-12 w-full rounded-2xl px-4 outline-none"><option>Tourist</option><option>Community steward</option><option>Local business</option><option>Tourism authority</option></select></label></div></section></Reveal>
      <Reveal delay={.08}><section className="decision-card"><div className="flex items-start gap-4"><Languages size={21} style={{color:"var(--mint)"}}/><div><h3 className="text-lg font-bold">Language</h3><p className="mt-1 text-xs" style={{color:"var(--tertiary)"}}>Interface and AI explanation language</p></div></div><div className="mt-6 flex gap-3">{(["th","en"] as const).map((item)=><button className={`chip ${locale===item?"chip-active":""}`} onClick={()=>setLocale(item)} key={item}>{item==="th"?"ภาษาไทย":"English"}</button>)}</div></section></Reveal>
      <Reveal delay={.11}><section className="decision-card"><div className="flex items-start gap-4"><Bot size={21} style={{color:"var(--mint)"}}/><div><h3 className="text-lg font-bold">AI and data controls</h3><p className="mt-1 text-xs" style={{color:"var(--tertiary)"}}>AI recommends; you retain authority</p></div></div><div className="mt-7 divide-y" style={{borderColor:"var(--line)"}}>{[{label:"Personalized recommendations",text:"Use your saved interests and journey context",value:personalization,set:setPersonalization},{label:"Impact learning",text:"Use anonymized outcomes to improve impact estimates",value:impact,set:setImpact},{label:"Decision notifications",text:"Notify you when readiness or capacity changes",value:notifications,set:setNotifications}].map((item)=><div className="flex items-center gap-5 py-5 first:pt-0" key={item.label}><div><p className="text-sm font-bold">{item.label}</p><p className="mt-1 text-xs leading-5" style={{color:"var(--tertiary)"}}>{item.text}</p></div><div className="ml-auto"><Toggle checked={item.value} onChange={item.set} label={item.label}/></div></div>)}</div></section></Reveal>
      <Reveal delay={.14}><section className="rounded-[28px] border p-6 sm:p-8" style={{borderColor:"color-mix(in srgb, var(--critical) 35%, var(--line))",background:"var(--surface)"}}><h3 className="font-bold" style={{color:"var(--critical)"}}>Data rights</h3><p className="body-copy mt-2 text-sm">ส่งออกข้อมูล ถอนความยินยอม หรือขอให้ลบข้อมูลที่ไม่จำเป็น โดยระบบจะแสดงผลกระทบก่อนยืนยัน</p><div className="mt-5 flex flex-wrap gap-3"><button className="secondary-button">ส่งออกข้อมูลของฉัน</button><button className="secondary-button" style={{color:"var(--critical)"}}>ถอนความยินยอม</button></div></section></Reveal>
      <button onClick={save} className="primary-button w-full sm:hidden">{saved?<><Check size={16}/> บันทึกแล้ว</>:"บันทึกการตั้งค่า"}</button></div>
    </div>
  </ProductShell>;
}
