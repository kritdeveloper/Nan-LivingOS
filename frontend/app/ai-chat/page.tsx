"use client";

import { useState, useRef, useEffect } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../utils/api";
import { ReasoningResult, RecommendationKind } from "../types";
import { LoadingState } from "../components/StatusState";

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  data?: ReasoningResult;
  loading?: boolean;
  error?: boolean;
}

export default function Chat() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedKind, setSelectedKind] = useState<RecommendationKind>("experience");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async (inputText: string = text, forceKind: RecommendationKind = selectedKind) => {
    const prompt = inputText.trim();
    if (!prompt) return;

    // Add user message
    const userMsg: ChatMessage = { sender: "user", text: prompt };
    // Add temporary AI loading message
    const loadingMsg: ChatMessage = { sender: "ai", text: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setText("");

    try {
      // Build request params based on kind
      const res = await api.aiReason({
        kind: forceKind,
        question: prompt,
        limit: 5,
        themes: forceKind === "experience" ? ["culture"] : [],
        community_ids: forceKind === "community" ? ["community-bo-kluea"] : [],
        start_entity_id: forceKind === "transportation" ? "attraction-wat-phumin" : null,
        destination_entity_ids: forceKind === "transportation" ? ["attraction-doi-phu-kha"] : [],
        travel_month: forceKind === "season" ? 12 : null,
      });

      // Update the loading message with actual result
      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          sender: "ai",
          text: res.summary,
          data: res,
        };
        return next;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to communicate with the reasoning engine.";
      setMessages((prev) => {
        const next = [...prev];
        const lastIdx = next.length - 1;
        next[lastIdx] = {
          sender: "ai",
          text: `Error: ${message}`,
          error: true,
        };
        return next;
      });
    }
  };

  const handleSuggestionClick = (prompt: string, kind: RecommendationKind) => {
    setSelectedKind(kind);
    send(prompt, kind);
  };

  return (
    <AppShell title="Ask Nan OS" kicker="Knowledge assistant">
      <div className="chat-wrap" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 180px)" }}>
        
        {messages.length === 0 ? (
          <div className="chat-intro" style={{ flex: 1, overflowY: "auto" }}>
            <span className="ai-orb">✦</span>
            <span className="label">YOUR CULTURAL GUIDE</span>
            <h2>What would you like to know?</h2>
            <p>I connect stories, places, and local knowledge to help you understand Nan more deeply.</p>
            
            {/* Mode selection chips */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", margin: "20px 0" }}>
              {(["experience", "community", "transportation", "season"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSelectedKind(k)}
                  style={{
                    border: "1px solid var(--line)",
                    borderRadius: "99px",
                    background: selectedKind === k ? "#dce9e2" : "#181d1b",
                    color: selectedKind === k ? "#142019" : "#8e9792",
                    padding: "8px 14px",
                    fontSize: "11px",
                    textTransform: "capitalize",
                    cursor: "pointer",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="suggestions">
              <button onClick={() => handleSuggestionClick("Tell me about the Whisper of Love mural at Wat Phumin", "experience")}>
                <span>◫</span>
                <b>Decode a story</b>
                <small>“Tell me about the Whisper of Love mural”</small>
              </button>
              <button onClick={() => handleSuggestionClick("Plan a quiet day in Bo Kluea", "community")}>
                <span>⌖</span>
                <b>Plan a community journey</b>
                <small>“Plan a quiet day in Bo Kluea”</small>
              </button>
              <button onClick={() => handleSuggestionClick("How should I travel to Doi Phu Kha?", "transportation")}>
                <span>◎</span>
                <b>Check travel route</b>
                <small>“How should I travel to Doi Phu Kha?”</small>
              </button>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.sender === "user" ? "flex-end" : "flex-start",
                }}
              >
                {m.sender === "user" ? (
                  <div className="user-message">{m.text}</div>
                ) : (
                  <div
                    style={{
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      borderRadius: "16px 16px 16px 3px",
                      padding: "20px",
                      color: "var(--text)",
                      width: "100%",
                    }}
                  >
                    {m.loading ? (
                      <LoadingState message="Consulting reasoning engine..." />
                    ) : m.error ? (
                      <span style={{ color: "var(--rose)", fontSize: "13px" }}>{m.text}</span>
                    ) : (
                      <div>
                        {/* Summary */}
                        <p style={{ font: "400 15px Georgia, serif", lineHeight: "1.6", margin: "0 0 20px" }}>
                          {m.text}
                        </p>

                        {/* Reasoning Result Items */}
                        {m.data?.items && m.data.items.length > 0 && (
                          <div style={{ marginTop: "15px" }}>
                            <small className="label" style={{ display: "block", marginBottom: "10px" }}>
                              Recommended Connections ({m.data.items.length})
                            </small>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                              {m.data.items.map((item) => (
                                <div
                                  key={item.entity_id}
                                  style={{
                                    border: "1px solid var(--line)",
                                    background: "var(--panel2)",
                                    borderRadius: "8px",
                                    padding: "12px",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <h4 style={{ margin: 0, fontFamily: "Georgia, serif", fontSize: "14px", color: "var(--mint)" }}>
                                      {item.title}
                                    </h4>
                                    <span style={{ color: "var(--gold)", fontSize: "11px", fontWeight: "bold" }}>
                                      Score: {item.score.toFixed(2)}
                                    </span>
                                  </div>
                                  <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "var(--muted)", lineHeight: "1.4" }}>
                                    {item.reasons.map((r, rIdx) => (
                                      <li key={rIdx}>{r}</li>
                                    ))}
                                  </ul>
                                  {item.cautions && item.cautions.length > 0 && (
                                    <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--rose)" }}>
                                      ⚠️ {item.cautions.join(", ")}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assumptions */}
                        {m.data?.assumptions && m.data.assumptions.length > 0 && (
                          <div style={{ marginTop: "15px", fontSize: "11px", color: "var(--muted)" }}>
                            <strong>Assumptions:</strong> {m.data.assumptions.join(", ")}
                          </div>
                        )}

                        {/* Citations */}
                        {m.data?.citations && m.data.citations.length > 0 && (
                          <div
                            style={{
                              marginTop: "20px",
                              paddingTop: "12px",
                              borderTop: "1px solid var(--line)",
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                            }}
                          >
                            <span style={{ fontSize: "10px", color: "var(--muted)", alignSelf: "center" }}>Sources:</span>
                            {m.data.citations.map((cite, cIdx) => (
                              <span
                                key={cIdx}
                                style={{
                                  fontSize: "10px",
                                  background: "#222a27",
                                  border: "1px solid #3c4943",
                                  color: "var(--mint)",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                }}
                              >
                                {cite.title} {cite.locator ? `[${cite.locator}]` : ""}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Model identifier */}
                        {m.data?.model && (
                          <div style={{ textAlign: "right", marginTop: "12px" }}>
                            <span style={{ fontSize: "9px", color: "var(--muted)", fontStyle: "italic" }}>
                              Powered by {m.data.model}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Chat input composer */}
        <div className="composer" style={{ marginTop: "15px" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", width: "100%" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", alignSelf: "center" }}>Reasoning Mode:</span>
            <select
              value={selectedKind}
              onChange={(e) => setSelectedKind(e.target.value as RecommendationKind)}
              style={{
                background: "#1c2220",
                border: "1px solid var(--line)",
                color: "var(--text)",
                padding: "4px 10px",
                borderRadius: "4px",
                fontSize: "11px",
              }}
            >
              <option value="experience">Experience</option>
              <option value="community">Community</option>
              <option value="transportation">Transportation</option>
              <option value="season">Seasonal</option>
            </select>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about a place, story, person, or tradition..."
          />
          <div>
            <span>＋</span>
            <small>Nan OS can make mistakes. Answers are grounded in the local knowledge graph.</small>
            <button onClick={() => send()} aria-label="Send message">↑</button>
          </div>
        </div>

      </div>
    </AppShell>
  );
}
