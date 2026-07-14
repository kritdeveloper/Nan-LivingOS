"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import type { GraphEntity } from "../types";
import { MapPinned } from "lucide-react";
import { useLocale } from "./LocaleProvider";

export function LivingMap({ entities, activeId, onSelect }: { entities: GraphEntity[]; activeId?: string; onSelect: (entity: GraphEntity) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const { entityName } = useLocale();
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !container.current || map.current) return;
    mapboxgl.accessToken = token;
    map.current = new mapboxgl.Map({ container: container.current, style: "mapbox://styles/mapbox/dark-v11", center: [100.77, 18.78], zoom: 7.3, attributionControl: true });
    map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    entities.filter((entity) => entity.latitude != null && entity.longitude != null).forEach((entity) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "grid size-9 place-items-center rounded-full border-2 border-white bg-[#69a68e] text-[#10201b] shadow-xl transition hover:scale-110";
      marker.setAttribute("aria-label", entityName(entity));
      marker.innerHTML = "<span aria-hidden='true'>●</span>";
      marker.onclick = () => onSelect(entity);
      new mapboxgl.Marker({ element: marker }).setLngLat([entity.longitude!, entity.latitude!]).addTo(map.current!);
    });
    return () => { map.current?.remove(); map.current = null; };
  }, [entities, entityName, onSelect, token]);

  useEffect(() => {
    const active = entities.find((entity) => entity.id === activeId);
    if (map.current && active?.latitude != null && active.longitude != null) map.current.flyTo({ center: [active.longitude, active.latitude], zoom: 10, duration: 900 });
  }, [activeId, entities]);

  if (!token) return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[28px] border p-6" style={{ borderColor: "var(--line)", background: "radial-gradient(circle at 30% 20%, #24473a, #0b100e 65%)" }}>
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#9fd0bc 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="relative flex h-full min-h-[370px] flex-col justify-between">
        <div className="glass max-w-sm rounded-3xl p-5"><MapPinned size={20} style={{ color: "var(--mint)" }} /><h3 className="mt-3 font-bold">Living map ready</h3><p className="mt-2 text-xs leading-5" style={{ color: "var(--muted)" }}>Mapbox integration is prepared. Add NEXT_PUBLIC_MAPBOX_TOKEN to activate the live geographic layer.</p></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {entities.slice(0, 4).map((entity) => <button key={entity.id} onClick={() => onSelect(entity)} className="glass flex min-h-12 items-center gap-3 rounded-2xl px-4 text-left text-xs font-bold"><span className="status-dot" />{entityName(entity)}</button>)}
        </div>
      </div>
    </div>
  );

  return <div ref={container} className="min-h-[520px] overflow-hidden rounded-[28px] border" style={{ borderColor: "var(--line)" }} aria-label="Interactive map of Nan experiences" />;
}
