"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../utils/api";
import { GraphEntity, GraphRelationship, KnowledgeSource } from "../types";
import { LoadingState, EmptyState, ErrorState } from "../components/StatusState";

// Standard string hash for stable node positioning
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = str.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

export default function Graph() {
  const [nodes, setNodes] = useState<GraphEntity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active / Selected Node State
  const [activeNode, setActiveNode] = useState<GraphEntity | null>(null);
  const [neighbors, setNeighbors] = useState<{ relationship: GraphRelationship; entity: GraphEntity }[]>([]);
  const [loadingNeighbors, setLoadingNeighbors] = useState(false);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);

  // Fetch all nodes matching search term
  const fetchNodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchEntities({
        q: search || undefined,
        limit: 30,
      });
      setNodes(res.items);

      // Auto-select first node if none active
      if (res.items.length > 0) {
        // If current active node is not in the new list, set first as active
        const exists = res.items.find((item) => item.id === activeNode?.id);
        if (!exists) {
          setActiveNode(res.items[0]);
        }
      } else {
        setActiveNode(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load graph nodes");
    } finally {
      setLoading(false);
    }
  };

  // Fetch neighbors when active node changes
  const fetchNeighbors = async (entityId: string) => {
    setLoadingNeighbors(true);
    try {
      const res = await api.getEntityNeighbors(entityId, [], 1, 15);
      setNeighbors(res.items);
    } catch (err) {
      console.error("Failed to load neighbors", err);
      setNeighbors([]);
    } finally {
      setLoadingNeighbors(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, [search]);

  useEffect(() => {
    if (activeNode) {
      fetchNeighbors(activeNode.id);
      api.getEntitySources(activeNode.id).then((result) => setSources(result.items)).catch(() => setSources([]));
    } else {
      setNeighbors([]);
      setSources([]);
    }
  }, [activeNode]);

  // Determine size of node based on its labels
  const getNodeSizeClass = (entity: GraphEntity) => {
    if (entity.labels.includes("Place")) return "large";
    if (entity.labels.includes("Community") || entity.labels.includes("CulturalHeritage")) {
      return "medium";
    }
    return "small";
  };

  // Stable position calculation using hash
  const getNodePosition = (entity: GraphEntity) => {
    const xHash = hashString(entity.id);
    const yHash = hashString(entity.id + "_y");
    
    // Spread nodes across the stage inside safe limits
    const x = (xHash % 70) + 15;
    const y = (yHash % 55) + 20;
    return { x, y };
  };

  return (
    <AppShell
      title="Knowledge Graph"
      kicker="Connected memory"
      action={<button className="button small">＋ Add knowledge</button>}
    >
      <div className="graph-toolbar">
        <div className="wide-search compact">
          <span>⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a person, place, or idea (murals, Doi, etc.)"
          />
        </div>
        <div>
          <button aria-label="Zoom out">−</button>
          <button aria-label="Zoom in">＋</button>
          <button aria-label="Recenter">⌖</button>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Mapping relationships..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchNodes} />
      ) : nodes.length === 0 ? (
        <EmptyState
          message="No matching entities found"
          description="Type another query (e.g. 'Wat', 'tradition', 'cool') to explore relationships."
        />
      ) : (
        <div style={{ position: "relative" }}>
          {/* Graph Stage rendering nodes and dynamic lines */}
          <div className="graph-stage">
            {/* SVG overlay to render links between selected node and its neighbors */}
            {activeNode && neighbors.length > 0 && (
              <svg
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  zIndex: 0,
                }}
              >
                {(() => {
                  const sourcePos = getNodePosition(activeNode);
                  return neighbors.map((neighbor) => {
                    const targetPos = getNodePosition(neighbor.entity);
                    return (
                      <line
                        key={neighbor.entity.id}
                        x1={`${sourcePos.x}%`}
                        y1={`${sourcePos.y}%`}
                        x2={`${targetPos.x}%`}
                        y2={`${targetPos.y}%`}
                        stroke="rgba(146, 201, 178, 0.45)"
                        strokeWidth="1.5"
                        strokeDasharray={neighbor.relationship.properties?.verifyRoadConditions ? "4 4" : undefined}
                      />
                    );
                  });
                })()}
              </svg>
            )}

            {/* Render Nodes */}
            {nodes.map((n) => {
              const pos = getNodePosition(n);
              const size = getNodeSizeClass(n);
              const isChosen = activeNode?.id === n.id;
              
              // Highlight selected node or its connected neighbors
              const isNeighbor = neighbors.some((item) => item.entity.id === n.id);
              const connectionClass = isChosen ? "chosen" : isNeighbor ? "neighbor-highlight" : "";

              return (
                <button
                  key={n.id}
                  onClick={() => setActiveNode(n)}
                  className={`node ${size} ${connectionClass}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    position: "absolute",
                    zIndex: isChosen ? 5 : 2,
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: isChosen ? "bold" : "normal" }}>
                    {n.nameEn || n.nameTh}
                  </span>
                </button>
              );
            })}

            <div className="legend">
              <span>
                <i className="gold" />
                Place / Attraction
              </span>
              <span>
                <i className="mint" />
                Community & Heritage
              </span>
              <span>
                <i className="blue" />
                Other nodes
              </span>
            </div>
          </div>

          {/* Inspector Panel */}
          <aside className="inspector" style={{ position: "absolute", right: "20px", top: "20px", zIndex: 10 }}>
            <span className="label">SELECTED ENTITY</span>
            <div className="inspector-art">น</div>
            
            {activeNode ? (
              <>
                <h2 style={{ fontFamily: "Georgia, serif", fontSize: "20px", margin: "10px 0 4px" }}>
                  {activeNode.nameTh}
                </h2>
                {activeNode.nameEn && (
                  <h4 style={{ color: "var(--mint)", fontSize: "11px", margin: "0 0 10px", letterSpacing: "0.05em" }}>
                    {activeNode.nameEn}
                  </h4>
                )}
                <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: "1.5", minHeight: "60px" }}>
                  {activeNode.description || "A living node in Nan's cultural memory."}
                </p>

                <div className="stats">
                  <span>
                    <b>{loadingNeighbors ? "..." : neighbors.length}</b>
                    <small>Direct Links</small>
                  </span>
                  <span>
                    <b>{Array.isArray(activeNode.properties?.themes) ? activeNode.properties.themes.length : 0}</b>
                    <small>Themes</small>
                  </span>
                  <span>
                    <b>{activeNode.visibility}</b>
                    <small>Visibility</small>
                  </span>
                </div>

                <div style={{ fontSize: "10px", color: "var(--muted)", marginBottom: "15px" }}>
                  <strong>Type:</strong> {activeNode.labels.join(", ")}
                </div>

                {sources.length > 0 && (
                  <div style={{ marginBottom: "15px" }}>
                    <small className="label" style={{ fontSize: "8px" }}>Sources</small>
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
                      {sources.slice(0, 3).map((source) => (
                        <a key={`${source.id}-${source.role}`} href={source.url} target="_blank" rel="noreferrer" style={{ color: "var(--mint)", fontSize: "9px" }}>
                          {source.publisher} · {source.role} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {neighbors.length > 0 && (
                  <div style={{ marginBottom: "15px" }}>
                    <small className="label" style={{ fontSize: "8px" }}>Connected items</small>
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px", maxHeight: "100px", overflowY: "auto" }}>
                      {neighbors.map((item) => (
                        <div
                          key={item.entity.id}
                          style={{
                            fontSize: "11px",
                            padding: "4px 8px",
                            background: "var(--panel2)",
                            borderRadius: "4px",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span style={{ color: "var(--text)" }}>{item.entity.nameEn || item.entity.nameTh}</span>
                          <span style={{ color: "var(--gold)", fontSize: "9px" }}>{item.relationship.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button className="button small">View full record →</button>
              </>
            ) : (
              <p style={{ fontSize: "12px", color: "var(--muted)" }}>Select a node to inspect its relations.</p>
            )}
          </aside>
        </div>
      )}
      
      {/* Node highlights style overrides */}
      <style jsx global>{`
        .node.neighbor-highlight {
          box-shadow: 0 0 15px rgba(146, 201, 178, 0.4);
          border-color: var(--mint);
        }
      `}</style>
    </AppShell>
  );
}
