"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../utils/api";
import { GraphEntity } from "../types";
import { LoadingState, EmptyState, ErrorState } from "../components/StatusState";

export default function Explorer() {
  const [term, setTerm] = useState("");
  const [entities, setEntities] = useState<GraphEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering states
  const [selectedLabel, setSelectedLabel] = useState<string>("All"); // 'All', 'Place', 'Community', 'CulturalHeritage'
  const [selectedTheme, setSelectedTheme] = useState<string>(""); // empty string means all

  const labelsList = [
    { name: "All stories", value: "All" },
    { name: "Places", value: "Place" },
    { name: "Community", value: "Community" },
    { name: "Traditions", value: "CulturalHeritage" },
    { name: "Seasons", value: "Season" },
  ];

  const themesList = [
    { name: "All themes", value: "" },
    { name: "Culture", value: "culture" },
    { name: "Nature", value: "nature" },
    { name: "History", value: "history" },
  ];

  const fetchEntities = async () => {
    setLoading(true);
    setError(null);
    try {
      const labelsArg = selectedLabel !== "All" ? [selectedLabel] : undefined;
      const res = await api.searchEntities({
        q: term || undefined,
        labels: labelsArg,
        theme: selectedTheme || undefined,
        limit: 30,
      });
      setEntities(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load entities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, [term, selectedLabel, selectedTheme]);

  const getEntityTone = (entity: GraphEntity) => {
    if (entity.labels.includes("Place")) return "gold";
    if (entity.labels.includes("Community")) return "mint";
    if (entity.labels.includes("CulturalHeritage")) return "blue";
    if (entity.labels.includes("Season")) return "violet";
    return "orange";
  };

  return (
    <AppShell
      title="Explore Nan"
      kicker="Living archive"
      action={
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            style={{
              background: "#1c2220",
              border: "1px solid var(--line)",
              color: "var(--text)",
              padding: "8px 12px",
              borderRadius: "99px",
              fontSize: "11px",
            }}
          >
            {themesList.map((t) => (
              <option key={t.value} value={t.value}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      <div className="wide-search">
        <span>⌕</span>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search the living memory of Nan (murals, salt, etc.)"
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="chips">
        {labelsList.map((lbl) => (
          <button
            key={lbl.value}
            className={selectedLabel === lbl.value ? "selected" : ""}
            onClick={() => setSelectedLabel(lbl.value)}
          >
            {lbl.name}
          </button>
        ))}
      </div>

      <div className="section-title">
        <div>
          <span className="label">ARCHIVE SCAN</span>
          <h2>Begin somewhere beautiful</h2>
        </div>
        <span>{entities.length} memories</span>
      </div>

      {loading ? (
        <LoadingState message="Scanning knowledge graph..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchEntities} />
      ) : entities.length === 0 ? (
        <EmptyState
          message="No records found matching your filters"
          description="Try typing another keyword (e.g. 'Wat', 'salt', 'cool') or changing filters."
        />
      ) : (
        <div className="explore-grid">
          {entities.map((entity, i) => {
            const tone = getEntityTone(entity);
            const title = entity.nameEn
              ? `${entity.nameEn} (${entity.nameTh})`
              : entity.nameTh;
            const subtitle = entity.labels.join(" · ");
            const desc = entity.description || "No description available in the archives.";

            return (
              <article key={entity.id}>
                <div className={`tile-art art-${i % 6}`}>
                  <span className={`dot ${tone}`}>{i + 1}</span>
                  <button aria-label="Favorite option">♡</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", height: "calc(100% - 145px)", justifyContent: "space-between" }}>
                  <div>
                    <small style={{ color: "var(--mint)", letterSpacing: "0.1em" }}>{subtitle}</small>
                    <h3 style={{ margin: "8px 0", fontSize: "18px", fontFamily: "Georgia, serif" }}>{title}</h3>
                    <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: "1.5" }}>{desc}</p>
                  </div>
                  <div style={{ marginTop: "12px" }}>
                    <a style={{ fontSize: "11px", color: "var(--mint)", textDecoration: "none", cursor: "pointer" }}>
                      Explore story →
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
