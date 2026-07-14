"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookHeart, CheckCircle2, CirclePause, Gauge, HandHeart, Plus, Users } from "lucide-react";
import { ProductShell } from "../components/ProductShell";
import { Reveal } from "../components/Reveal";
import { api } from "../utils/api";
import type { CommunityPost, GraphEntity } from "../types";
import { useLocale } from "../components/LocaleProvider";

export default function CommunityPage() {
  const { entityName } = useLocale();
  const [communities, setCommunities] = useState<GraphEntity[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { Promise.all([api.searchEntities({ labels:["Community"], limit:20 }), api.listCommunityPosts()]).then(([entities,stories]) => { setCommunities(entities.items); setPosts(stories.items); }); }, []);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setMessage(""); try { await api.createCommunityPost({ title, body, language:"th", visibility:"public" }); setMessage("ส่งเรื่องราวเข้าสู่คิวตรวจสอบแล้ว"); setTitle(""); setBody(""); } catch (error) { setMessage(error instanceof Error ? error.message : "ไม่สามารถส่งข้อมูลได้"); } };

  return <ProductShell title="Community" description="Ownership, readiness and shared value" action={<button className="primary-button hidden sm:inline-flex" onClick={() => setOpen(true)}><Plus size={16} /> แบ่งปันเรื่องราว</button>}>
    <Reveal><section className="grid min-h-[360px] overflow-hidden rounded-[32px] border lg:grid-cols-[1.15fr_.85fr]" style={{ background:"var(--surface)", borderColor:"var(--line)" }}><div className="p-7 sm:p-10 lg:p-14"><p className="eyebrow">Communities before attractions</p><h2 className="page-title mt-4 max-w-xl">ชุมชนควบคุมเรื่องราว ความพร้อม และคุณค่าของตนเอง</h2><p className="body-copy mt-5 max-w-xl">NAN FLOW มองชุมชนเป็นผู้กำหนดระบบ ไม่ใช่ supplier ชุมชนจึงเลือกได้ว่าจะเปิดรับใคร เมื่อไร และในเงื่อนไขใด</p><button className="primary-button mt-8" onClick={() => setOpen(true)}>แบ่งปันความทรงจำ <ArrowRight size={16} /></button></div><div className="relative min-h-[280px] p-7" style={{ background:"linear-gradient(145deg, #24473a, #10201b)" }}><div className="glass absolute left-7 top-7 rounded-3xl p-5 text-white"><HandHeart size={21} /><p className="mt-4 text-sm font-bold">Community sovereignty</p><p className="mt-2 max-w-xs text-xs leading-5 opacity-70">สิทธิ์ ความยินยอม และการปฏิเสธมาก่อนความสะดวก</p></div><div className="absolute bottom-7 right-7 grid size-36 place-items-center rounded-full border border-white/20 text-center text-white"><div><strong className="text-4xl" style={{ fontFamily:"Georgia,serif" }}>{communities.length}</strong><span className="mt-1 block text-[10px] uppercase tracking-widest opacity-60">communities</span></div></div></div></section></Reveal>

    <div className="mt-6 grid gap-4 md:grid-cols-3">{[{icon:CheckCircle2,label:"Readiness",value:"Community-led",text:"ประกาศความพร้อมได้ตลอดเวลา"},{icon:Gauge,label:"Capacity",value:"Protected",text:"ไม่แนะนำเกินขีดความสามารถ"},{icon:CirclePause,label:"Right to pause",value:"Immediate",text:"หยุดหรือจำกัดได้โดยไม่เสียสิทธิ์"}].map(({icon:Icon,label,value,text},i) => <Reveal delay={i*.05} key={label}><article className="soft-card"><Icon size={20} style={{ color:"var(--mint)" }} /><p className="eyebrow mt-6">{label}</p><strong className="mt-2 block text-xl">{value}</strong><p className="mt-2 text-xs" style={{ color:"var(--tertiary)" }}>{text}</p></article></Reveal>)}</div>

    <section className="mt-12"><div className="flex items-end justify-between"><div><p className="eyebrow">Community knowledge</p><h2 className="section-title mt-3">เสียงจากพื้นที่</h2></div><span className="chip"><Users size={14} /> {communities.length} communities</span></div><div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{communities.slice(0,6).map((community,index) => <Reveal delay={index*.04} key={community.id}><article className="soft-card min-h-[240px]"><BookHeart size={20} style={{ color:"var(--gold)" }} /><h3 className="mt-9 text-xl font-semibold" style={{ fontFamily:"Georgia,serif" }}>{entityName(community)}</h3><p className="mt-3 line-clamp-3 text-sm leading-6" style={{ color:"var(--muted)" }}>{community.description || "ชุมชนเจ้าขององค์ความรู้และประสบการณ์มีชีวิต"}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold"><span className="status-dot" /> Context available</span></article></Reveal>)}</div></section>

    {posts.length > 0 && <section className="mt-12"><p className="eyebrow">Published contributions</p><div className="mt-5 grid gap-4 md:grid-cols-2">{posts.map((post) => <article className="soft-card" key={post.id}><h3 className="font-bold">{post.title}</h3><p className="body-copy mt-3 text-sm">{post.body}</p></article>)}</div></section>}

    {open && <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title"><form onSubmit={submit} className="glass w-full max-w-xl rounded-[28px] p-6 sm:p-8"><div className="flex items-start justify-between"><div><p className="eyebrow">Community contribution</p><h2 id="share-title" className="section-title mt-2">แบ่งปันความทรงจำ</h2></div><button type="button" onClick={() => setOpen(false)} className="icon-button" aria-label="Close">×</button></div><label className="mt-7 block text-xs font-bold">ชื่อเรื่อง<input required value={title} onChange={(e) => setTitle(e.target.value)} className="surface mt-2 min-h-12 w-full rounded-2xl px-4 outline-none" /></label><label className="mt-5 block text-xs font-bold">เรื่องราว<textarea required value={body} onChange={(e) => setBody(e.target.value)} className="surface mt-2 min-h-36 w-full resize-none rounded-2xl p-4 outline-none" /></label><p className="mt-3 text-xs" style={{ color:"var(--tertiary)" }}>เรื่องราวจะเข้าสู่คิวตรวจสอบและไม่เผยแพร่อัตโนมัติ</p>{message && <p className="mt-4 text-sm font-bold" style={{ color:"var(--mint)" }}>{message}</p>}<div className="mt-6 flex justify-end gap-3"><button type="button" className="secondary-button" onClick={() => setOpen(false)}>ยกเลิก</button><button className="primary-button">ส่งเพื่อตรวจสอบ <ArrowRight size={15} /></button></div></form></div>}
  </ProductShell>;
}
