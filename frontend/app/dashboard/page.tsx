"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../utils/api";
import { DashboardSummary, CommunityPost } from "../types";
import { LoadingState, ErrorState } from "../components/StatusState";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [submittedPosts, setSubmittedPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Authenticate as administrator to query dashboard metrics
      const token = localStorage.getItem("access_token");
      if (!token) {
        await api.login("admin@nan.local", "ChangeMe123!");
      }
      
      const [sumRes, postRes] = await Promise.all([
        api.getDashboardSummary(),
        api.listCommunityPosts("submitted"),
      ]);

      setSummary(sumRes);
      setSubmittedPosts(postRes.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleModerate = async (postId: string, approve: boolean) => {
    try {
      await api.moderateCommunityPost(postId, approve);
      // Reload stats and posts after moderate action
      const [sumRes, postRes] = await Promise.all([
        api.getDashboardSummary(),
        api.listCommunityPosts("submitted"),
      ]);
      setSummary(sumRes);
      setSubmittedPosts(postRes.items);
    } catch (err: unknown) {
      alert(`Moderation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  if (loading) {
    return (
      <AppShell title="Dashboard" kicker="Steward panel">
        <LoadingState message="Connecting to cultural ledger..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Dashboard" kicker="Steward panel">
        <ErrorState error={error} onRetry={loadData} />
      </AppShell>
    );
  }

  // Aggregate counts
  const totalNodes = Object.values(summary?.entities || {}).reduce((a, b) => a + b, 0);
  const totalPosts = Object.values(summary?.posts || {}).reduce((a, b) => a + b, 0);

  return (
    <AppShell title="Curator Dashboard" kicker="Nan Living OS" action={
      <button className="button small" onClick={loadData}>Refresh Metrics</button>
    }>
      <div className="metrics">
        <article>
          <span className="metric-icon">◌</span>
          <small>Total Users</small>
          <b>{summary?.users || 0}</b>
          <em>Registered stewards</em>
        </article>
        <article>
          <span className="metric-icon">◎</span>
          <small>Knowledge Nodes</small>
          <b>{totalNodes}</b>
          <em>Across database</em>
        </article>
        <article>
          <span className="metric-icon">⌕</span>
          <small>Community Stories</small>
          <b>{totalPosts}</b>
          <em>Local submissions</em>
        </article>
        <article>
          <span className="metric-icon">↗</span>
          <small>Pending Review</small>
          <b>{submittedPosts.length}</b>
          <em>Requires review</em>
        </article>
      </div>

      <div className="dashboard-grid">
        {/* Knowledge Node breakdown */}
        <section className="activity-panel">
          <div className="panel-head">
            <div>
              <span className="label">ONTOLOGY RATIO</span>
              <h2>Knowledge Graph Composition</h2>
            </div>
          </div>
          
          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {summary?.entities && Object.entries(summary.entities).map(([label, count]) => {
              const pct = totalNodes > 0 ? (count / totalNodes) * 100 : 0;
              return (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: "bold", color: "var(--text)" }}>{label}</span>
                    <span style={{ color: "var(--mint)" }}>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--panel2)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "var(--mint)", borderRadius: "3px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Review panel */}
        <section className="review-panel">
          <div className="panel-head">
            <div>
              <span className="label">COMMUNITY FLOW</span>
              <h2>Mod Queue</h2>
            </div>
            <span style={{ fontSize: "11px", color: "var(--gold)" }}>
              {submittedPosts.length} pending
            </span>
          </div>

          <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {submittedPosts.length === 0 ? (
              <p style={{ fontSize: "12px", color: "var(--muted)", fontStyle: "italic", textAlign: "center", padding: "20px" }}>
                Queue is clear. No posts require review.
              </p>
            ) : (
              submittedPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    background: "var(--panel2)",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px" }}>{post.title}</strong>
                    <span style={{ fontSize: "9px", color: "var(--muted)" }}>{post.language.toUpperCase()}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 10px" }}>
                    &ldquo;{post.body.slice(0, 100)}{post.body.length > 100 ? "..." : ""}&rdquo;
                  </p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="button small"
                      style={{
                        flex: 1,
                        padding: "6px",
                        background: "var(--rose)",
                        color: "#fff",
                        border: "0",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                      onClick={() => handleModerate(post.id, false)}
                    >
                      Reject
                    </button>
                    <button
                      className="button small"
                      style={{
                        flex: 1,
                        padding: "6px",
                        background: "var(--mint)",
                        color: "#142019",
                        border: "0",
                        fontSize: "10px",
                        cursor: "pointer",
                      }}
                      onClick={() => handleModerate(post.id, true)}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="continue">
        <div className="panel-head">
          <div>
            <span className="label">COMMUNITY SUBMISSION HISTORY</span>
            <h2>Post Status Summary</h2>
          </div>
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "15px", flexWrap: "wrap" }}>
          {summary?.posts && Object.entries(summary.posts).map(([status, count]) => (
            <div
              key={status}
              style={{
                flex: 1,
                minWidth: "120px",
                border: "1px solid var(--line)",
                borderRadius: "8px",
                padding: "16px",
                background: "var(--panel2)",
                textAlign: "center",
              }}
            >
              <div className="label" style={{ fontSize: "9px" }}>{status}</div>
              <div style={{ fontSize: "24px", fontFamily: "Georgia, serif", color: "var(--gold)", margin: "5px 0" }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
