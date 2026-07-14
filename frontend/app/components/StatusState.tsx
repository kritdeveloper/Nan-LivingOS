"use client";

import React from "react";

export function LoadingState({ message = "Searching the archives..." }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "2px solid rgba(146, 201, 178, 0.2)",
          borderTopColor: "var(--mint)",
          animation: "spin 1s linear infinite",
          marginBottom: "16px",
        }}
      />
      <span className="label" style={{ letterSpacing: "0.12em", color: "var(--muted)" }}>
        {message}
      </span>
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export function EmptyState({
  message = "No memories match your query.",
  description = "Try adjusting your filters or search term.",
}: {
  message?: string;
  description?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
        border: "1px dashed var(--line)",
        borderRadius: "16px",
        background: "var(--panel)",
        margin: "20px 0",
      }}
    >
      <span style={{ fontSize: "32px", color: "var(--muted)", marginBottom: "12px" }}>◌</span>
      <h3 style={{ font: "400 18px Georgia", margin: "0 0 6px", color: "var(--text)" }}>{message}</h3>
      <p style={{ font: "12px Georgia", color: "var(--muted)", margin: 0 }}>{description}</p>
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: string | Error;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : error;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "45px 30px",
        textAlign: "center",
        border: "1px solid rgba(200, 143, 139, 0.2)",
        borderRadius: "16px",
        background: "rgba(23, 28, 26, 0.8)",
        margin: "20px 0",
      }}
    >
      <span style={{ fontSize: "28px", color: "var(--rose)", marginBottom: "12px" }}>✕</span>
      <h3 style={{ font: "400 18px Georgia", margin: "0 0 8px", color: "var(--text)" }}>
        Unable to load archives
      </h3>
      <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 20px", maxWidth: "400px" }}>
        {message}
      </p>
      {onRetry && (
        <button className="button small" onClick={onRetry}>
          Retry Connection
        </button>
      )}
    </div>
  );
}
