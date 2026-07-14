"use client";

import { useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../utils/api";
import { CommunityPost, User } from "../types";
import { LoadingState, EmptyState, ErrorState } from "../components/StatusState";

export default function Community() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth / Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formLang, setFormLang] = useState("en");
  const [formVisibility, setFormVisibility] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize and check user authentication
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        // Auto-login in development to facilitate direct integration
        await api.login("admin@nan.local", "ChangeMe123!");
      }
      const user = await api.getMe();
      setCurrentUser(user);
    } catch (err) {
      console.warn("Auth check failed, user may be visitor", err);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listCommunityPosts();
      setPosts(res.items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load community posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      await fetchPosts();
    };
    init();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formBody.trim()) {
      setFormError("Title and description are required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      // 1. Create Post
      const post = await api.createCommunityPost({
        title: formTitle,
        body: formBody,
        language: formLang,
        visibility: formVisibility,
      });

      // 2. Auto-submit for moderation
      await api.submitCommunityPost(post.id);

      // Reset form
      setFormTitle("");
      setFormBody("");
      setShowModal(false);
      
      // Reload posts
      fetchPosts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to submit contribution");
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerate = async (postId: string, approve: boolean) => {
    try {
      await api.moderateCommunityPost(postId, approve);
      fetchPosts();
    } catch (err: unknown) {
      alert(`Moderation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Helper for formatting status tags
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "approved":
        return { color: "var(--mint)", background: "rgba(146, 201, 178, 0.15)" };
      case "submitted":
        return { color: "var(--gold)", background: "rgba(211, 173, 112, 0.15)" };
      case "rejected":
        return { color: "var(--rose)", background: "rgba(200, 143, 139, 0.15)" };
      default:
        return { color: "var(--muted)", background: "rgba(150, 158, 153, 0.15)" };
    }
  };

  return (
    <AppShell
      title="Community Portal"
      kicker="Shared by Nan"
      action={
        <button className="button small" onClick={() => setShowModal(true)}>
          ＋ Share a memory
        </button>
      }
    >
      <section className="community-hero">
        <div>
          <span className="label">THE ARCHIVE BELONGS TO EVERYONE</span>
          <h2>
            Memory lives<br />
            when we <i>share it.</i>
          </h2>
          <p>
            Local voices, family photographs, oral histories, and everyday knowledge—preserved with care and shared
            with permission.
          </p>
          <button className="button" onClick={() => setShowModal(true)}>
            Contribute your story →
          </button>
        </div>
        <div className="portrait-stack">
          <div className="portrait p1">
            <span>“The pattern tells you where our family came from.”</span>
          </div>
          <div className="portrait p2" />
        </div>
      </section>

      <div className="community-stats">
        <span>
          <b>{posts.filter((p) => p.status === "approved").length}</b>
          <small>Approved stories</small>
        </span>
        <span>
          <b>{posts.length}</b>
          <small>Total shared contributions</small>
        </span>
        <span>
          <b>1</b>
          <small>Steward moderator</small>
        </span>
        <span>
          <b>2</b>
          <small>Living languages (TH / EN)</small>
        </span>
      </div>

      <div className="section-title">
        <div>
          <span className="label">RECENTLY SHARED</span>
          <h2>From the community</h2>
        </div>
        <button onClick={fetchPosts} style={{ background: "none", border: "0", color: "var(--mint)", cursor: "pointer", fontSize: "11px" }}>
          Refresh list ↻
        </button>
      </div>

      {loading ? (
        <LoadingState message="Retrieving community submissions..." />
      ) : error ? (
        <ErrorState error={error} onRetry={fetchPosts} />
      ) : posts.length === 0 ? (
        <EmptyState
          message="No community stories have been published yet"
          description="Be the first to share a memory of Nan by clicking 'Share a memory' above!"
        />
      ) : (
        <div className="memory-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {posts.map((post, i) => {
            const statusStyle = getStatusStyle(post.status);
            return (
              <article key={post.id} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%" }}>
                <div>
                  <div className={`memory-img m${i % 3}`} />
                  <div style={{ padding: "15px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <small style={{ color: "var(--muted)" }}>
                        {post.visibility.toUpperCase()} · {post.language.toUpperCase()}
                      </small>
                      <span
                        style={{
                          fontSize: "9px",
                          padding: "2px 8px",
                          borderRadius: "99px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          ...statusStyle,
                        }}
                      >
                        {post.status}
                      </span>
                    </div>
                    <h3 style={{ margin: "5px 0 10px", fontFamily: "Georgia, serif" }}>{post.title}</h3>
                    <p style={{ fontSize: "13px", color: "var(--text)", lineHeight: "1.5", fontStyle: "italic", whiteSpace: "pre-wrap" }}>
                      &ldquo;{post.body}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Moderation Controls for Curators */}
                {post.status === "submitted" && currentUser?.roles?.includes("curator") && (
                  <div
                    style={{
                      padding: "10px 15px",
                      background: "var(--panel2)",
                      borderTop: "1px solid var(--line)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <button
                      className="button small"
                      style={{ flex: 1, padding: "6px", background: "var(--rose)", color: "#fff", border: "0", fontSize: "11px" }}
                      onClick={() => handleModerate(post.id, false)}
                    >
                      Reject
                    </button>
                    <button
                      className="button small"
                      style={{ flex: 1, padding: "6px", background: "var(--mint)", color: "#142019", border: "0", fontSize: "11px" }}
                      onClick={() => handleModerate(post.id, true)}
                    >
                      Approve
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Share memory modal dialog */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "30px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ font: "400 24px Georgia, serif", margin: "0 0 10px" }}>Share your Nan Memory</h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "20px" }}>
              Help preserve the living history. Submissions will be sent to the cultural steward for review.
            </p>

            <form onSubmit={handleCreatePost}>
              <div style={{ marginBottom: "15px" }}>
                <label className="label" style={{ marginBottom: "6px" }}>Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Grandma's weaving loom, Traditional recipe"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                  required
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label className="label" style={{ marginBottom: "6px" }}>Your Story / Memory</label>
                <textarea
                  value={formBody}
                  onChange={(e) => setFormBody(e.target.value)}
                  placeholder="Tell us what you remember or the history of this place/item..."
                  style={{
                    width: "100%",
                    height: "120px",
                    padding: "10px 14px",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: "8px",
                    color: "white",
                    resize: "none",
                  }}
                  required
                />
              </div>

              <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                <div style={{ flex: 1 }}>
                  <label className="label" style={{ marginBottom: "6px" }}>Language</label>
                  <select
                    value={formLang}
                    onChange={(e) => setFormLang(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                  >
                    <option value="en">English</option>
                    <option value="th">ภาษาไทย</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label" style={{ marginBottom: "6px" }}>Visibility</label>
                  <select
                    value={formVisibility}
                    onChange={(e) => setFormVisibility(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                  >
                    <option value="public">Public</option>
                    <option value="community">Community Only</option>
                    <option value="restricted">Restricted (Stewards Only)</option>
                  </select>
                </div>
              </div>

              {formError && (
                <div style={{ color: "var(--rose)", fontSize: "12px", marginBottom: "15px" }}>⚠️ {formError}</div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="button small"
                  style={{ background: "none", color: "var(--muted)", border: "1px solid var(--line)" }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button small"
                  disabled={submitting}
                  style={{ background: "var(--mint)", color: "#142019" }}
                >
                  {submitting ? "Submitting..." : "Submit memory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
