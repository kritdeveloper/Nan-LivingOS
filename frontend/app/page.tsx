"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

const places = [
  { name: "Wat Phumin", type: "Sacred architecture", x: 67, y: 28, tone: "gold" },
  { name: "Doi Phu Kha", type: "Living landscape", x: 24, y: 57, tone: "mint" },
  { name: "Bo Kluea", type: "Salt heritage", x: 72, y: 70, tone: "blue" },
];

function Icon({ children }: { children: React.ReactNode }) {
  return <span className="icon" aria-hidden>{children}</span>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
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

  return (
    <main className="landing">
      <nav className="topbar">
        <Link href="/" className="brand"><span className="brandmark">น</span><span>NAN</span><em>Living OS</em></Link>
        <div className="navlinks">
          <Link href="/explorer">Explore</Link><Link href="/knowledge-graph">Knowledge</Link><Link href="/community">Community</Link>
        </div>
        <div className="nav-actions">
          <button
            className="round"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            style={{ display: "grid", placeItems: "center", fontSize: "16px", cursor: "pointer" }}
          >
            {theme === "dark" ? "☼" : "☾"}
          </button>
          <Link className="button small" href="/ai-chat">Ask Nan OS <span>↗</span></Link>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span>✦</span> A living cultural intelligence</div>
        <h1>Every place<br/>holds a <i>memory.</i></h1>
        <p>Discover the stories, people, and landscapes that make Nan more than a destination.</p>
        <div className="searchbox">
          <Icon>⌕</Icon><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search places, stories, traditions..."/>
          <Link href={`/explorer?q=${encodeURIComponent(query)}`} className="searchgo" aria-label="Search">→</Link>
        </div>
        <div className="quick"><span>Try</span><Link href="/explorer">Temple murals</Link><Link href="/explorer">Tai Lue textiles</Link><Link href="/map">Mountain trails</Link></div>
      </section>

      <section className="story-grid">
        <article className="feature-card">
          <div className="feature-art"><div className="sun"/><div className="mountain one"/><div className="mountain two"/><span className="vertical">เมืองน่าน · ความทรงจำที่มีชีวิต</span></div>
          <div className="feature-copy"><span className="label">Featured story · 8 min</span><h2>The quiet language of temple walls</h2><p>Inside Wat Phumin, painted stories reveal how the people of Nan once saw love, trade, and the wider world.</p><div className="author"><span className="avatar">KS</span><div><b>Dr. Kanda Saeng</b><small>Cultural historian</small></div><button onClick={() => setSaved(!saved)} aria-label="Save story">{saved ? "♥" : "♡"}</button></div></div>
        </article>
        <aside className="map-card">
          <div className="card-head"><div><span className="label">Explore nearby</span><h3>Stories on the map</h3></div><Link href="/map">Open map ↗</Link></div>
          <div className="mini-map">
            <span className="road r1"/><span className="road r2"/><span className="river"/>
            {places.map((p,i)=><Link href="/map" key={p.name} className={`pin ${p.tone}`} style={{left:`${p.x}%`,top:`${p.y}%`}}><b>{i+1}</b><span>{p.name}</span></Link>)}
          </div>
          <div className="place-list">{places.map((p,i)=><Link href="/explorer" key={p.name}><span className={`dot ${p.tone}`}>{i+1}</span><div><b>{p.name}</b><small>{p.type}</small></div><em>›</em></Link>)}</div>
        </aside>
      </section>

      <section className="portal-strip">
        <div><span className="label">More ways to explore</span><h2>Follow your curiosity.</h2></div>
        <div className="portal-links">
          <Link href="/knowledge-graph"><Icon>◎</Icon><span><b>Knowledge graph</b><small>See how everything connects</small></span><em>↗</em></Link>
          <Link href="/ai-chat"><Icon>✦</Icon><span><b>Ask Nan OS</b><small>Explore connected community knowledge</small></span><em>↗</em></Link>
          <Link href="/community"><Icon>◌</Icon><span><b>Community archive</b><small>Stories shared by local people</small></span><em>↗</em></Link>
        </div>
      </section>
      <footer><div className="brand"><span className="brandmark">น</span><span>NAN</span><em>Living OS</em></div><p>Connecting knowledge, communities, and impact.</p><Link href="/dashboard">Contributor dashboard →</Link></footer>
    </main>
  );
}
