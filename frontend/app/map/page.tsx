"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../utils/api";
import { GraphEntity } from "../types";
import { LoadingState, EmptyState, ErrorState } from "../components/StatusState";

export default function MapPage() {
  const [entities, setEntities] = useState<GraphEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeEntity, setActiveEntity] = useState<GraphEntity | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("All"); // 'All', 'culture', 'nature', 'community'

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    try {
      const themeParam = selectedTheme !== "All" && selectedTheme !== "community" ? selectedTheme : undefined;
      const labelParam = selectedTheme === "community" ? ["Community"] : undefined;
      
      const res = await api.searchEntities({
        theme: themeParam,
        labels: labelParam,
        limit: 40,
      });

      // Filter entities that have valid latitude and longitude
      const filtered = res.items.filter(
        (item) => item.latitude !== null && item.longitude !== null
      );
      setEntities(filtered);

      // Auto-select the first entity
      if (filtered.length > 0) {
        setActiveEntity(filtered[0]);
      } else {
        setActiveEntity(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load coordinates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [selectedTheme]);

  // Project lat/long to map canvas percentage coordinates dynamically
  const projectCoords = (lat: number, lon: number) => {
    if (entities.length <= 1) {
      return { x: 50, y: 50 };
    }
    const lons = entities.map((e) => e.longitude!);
    const lats = entities.map((e) => e.latitude!);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const lonRange = maxLon - minLon || 1;
    const latRange = maxLat - minLat || 1;

    // Project coordinates keeping margins (15% to 85% horizontally, 20% to 80% vertically)
    const x = 15 + ((lon - minLon) / lonRange) * 70;
    const y = 80 - ((lat - minLat) / latRange) * 60; // top is 0 in CSS, so invert Y
    return { x, y };
  };

  const getEntityTone = (entity: GraphEntity) => {
    if (entity.labels.includes("Community")) return "mint";
    const themes = entity.properties?.themes;
    if (Array.isArray(themes) && themes.includes("nature")) return "mint";
    return "gold";
  };

  return (
    <AppShell title="Living Map" kicker="Explore by place">
      <div className="map-controls">
        <div className="wide-search compact" style={{ display: "none" }}>
          {/* Kept wrapper for layout compatibility */}
          <input placeholder="Search the map..." />
        </div>
        <div className="chips" style={{ margin: "0 0 15px 0" }}>
          <button className={selectedTheme === "All" ? "selected" : ""} onClick={() => setSelectedTheme("All")}>
            All Places
          </button>
          <button className={selectedTheme === "culture" ? "selected" : ""} onClick={() => setSelectedTheme("culture")}>
            Culture & Art
          </button>
          <button className={selectedTheme === "nature" ? "selected" : ""} onClick={() => setSelectedTheme("nature")}>
            Nature
          </button>
          <button className={selectedTheme === "community" ? "selected" : ""} onClick={() => setSelectedTheme("community")}>
            Community
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Triangulating cultural coordinates..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchLocations} />
      ) : entities.length === 0 ? (
        <EmptyState
          message="No places match this selection"
          description="Try selecting another category or add new location-aware records."
        />
      ) : (
        <div className="full-map">
          <span className="river big" />
          <span className="road mr1" />
          <span className="road mr2" />
          
          <div className="map-label l1">NORTHERN DISTRICTS</div>
          <div className="map-label l2">NAN VALLEY</div>
          <div className="map-label l3">SALT MOUNTAINS</div>

          {entities.map((entity, i) => {
            const pos = projectCoords(entity.latitude!, entity.longitude!);
            const tone = getEntityTone(entity);
            const isChosen = activeEntity?.id === entity.id;

            return (
              <button
                key={entity.id}
                className={`map-pin ${tone} ${isChosen ? "active" : ""}`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  zIndex: isChosen ? 10 : 2,
                }}
                onClick={() => setActiveEntity(entity)}
              >
                <span>{i + 1}</span>
                <b>{entity.nameEn || entity.nameTh}</b>
              </button>
            );
          })}

          {activeEntity && (
            <aside className="map-detail" style={{ zIndex: 12 }}>
              <div className="map-photo" style={{ background: "linear-gradient(135deg, #2a3a33, #151b19)", display: "grid", placeItems: "center", color: "var(--mint)" }}>
                🗺️
              </div>
              <span className="label">
                {activeEntity.labels.join(" · ")}
              </span>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", margin: "6px 0 2px" }}>
                {activeEntity.nameTh}
              </h2>
              {activeEntity.nameEn && (
                <h4 style={{ color: "var(--mint)", fontSize: "11px", margin: "0 0 10px", fontWeight: "normal" }}>
                  {activeEntity.nameEn}
                </h4>
              )}
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px", lineHeight: "1.4" }}>
                {activeEntity.description || "Explore living stories and local traditions held by this place."}
              </p>
              <div style={{ display: "flex", gap: "12px", fontSize: "10px", color: "var(--gold)" }}>
                <span>Lat: {activeEntity.latitude?.toFixed(3)}</span>
                <span>Lon: {activeEntity.longitude?.toFixed(3)}</span>
              </div>
              <button className="button" style={{ marginTop: "12px", width: "100%" }}>
                Explore this place →
              </button>
            </aside>
          )}

          <div className="zoom">
            <button aria-label="Zoom in">＋</button>
            <button aria-label="Zoom out">−</button>
            <button aria-label="Recenter">⌖</button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
