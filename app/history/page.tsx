"use client";
import { useEffect, useState } from "react";
import { FrameResult } from "../types";
import Link from "next/link";

export default function History() {
  const [frames, setFrames] = useState<FrameResult[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("snooker_frames");
    if (saved) setFrames(JSON.parse(saved));
  }, []);

  const togglePaid = (id: string) => {
    const updated = frames.map(f => f.id === id ? { ...f, paid: !f.paid } : f);
    setFrames(updated);
    localStorage.setItem("snooker_frames", JSON.stringify(updated));
  };

  const clearAll = () => {
    if (confirm("Wach bghiti t7yed ga3 l history?")) {
      localStorage.removeItem("snooker_frames");
      setFrames([]);
    }
  };

  const unpaidCount = frames.filter(f => !f.paid).length;

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: "28px 24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link href="/" style={{ color: "#555", fontSize: 13, textDecoration: "none", letterSpacing: 1 }}>
            Back
          </Link>
          <h2 style={{ fontSize: 13, letterSpacing: 3, color: "#4a4a5a", textTransform: "uppercase" }}>
            History
          </h2>
          <button onClick={clearAll}
            style={{ background: "transparent", border: "none", color: "#442222", fontSize: 12, cursor: "pointer", letterSpacing: 1 }}>
            Clear all
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          <div style={{ background: "#17171f", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total frames</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#fff" }}>{frames.length}</div>
          </div>
          <div style={{ background: "#1a0808", border: "1px solid #3a1a1a", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#442222", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Unpaid</div>
            <div style={{ fontSize: 28, fontWeight: 500, color: "#E24B4A" }}>{unpaidCount}</div>
          </div>
        </div>

        {frames.length === 0 ? (
          <div style={{ textAlign: "center", color: "#333", fontSize: 13, marginTop: 60, letterSpacing: 1 }}>
            Ma kayn walo mazal...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[...frames].reverse().map(f => (
              <div key={f.id}
                style={{ background: "#17171f", borderRadius: 12, padding: "14px 16px",
                  border: `1px solid ${f.paid ? "#1a2a1a" : "#3a1a1a"}`,
                  display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    {/* Winner */}
                    <span style={{ fontSize: 11, background: "#0a1a0a", border: "1px solid #1a3a1a",
                      color: "#1D9E75", padding: "2px 8px", borderRadius: 6, letterSpacing: 1, textTransform: "uppercase" }}>
                      WIN
                    </span>
                    <span style={{ fontSize: 12, color: "#1D9E75", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>
                      {f.winner}
                    </span>
                    <span style={{ fontSize: 11, color: "#444" }}>{f.winnerScore} — {f.loserScore}</span>
                    {/* Loser */}
                    <span style={{ fontSize: 12, color: "#E24B4A", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>
                      {f.loser}
                    </span>
                    <span style={{ fontSize: 11, background: "#1a0808", border: "1px solid #3a1a1a",
                      color: "#E24B4A", padding: "2px 8px", borderRadius: 6, letterSpacing: 1, textTransform: "uppercase" }}>
                      LOSE
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: "#333", letterSpacing: 0.5 }}>{f.date}</div>
                </div>
                <button onClick={() => togglePaid(f.id)}
                  style={{ padding: "8px 14px", borderRadius: 8,
                    border: `1px solid ${f.paid ? "#1a3a1a" : "#3a1a1a"}`,
                    background: f.paid ? "#0a1a0a" : "#1a0808",
                    color: f.paid ? "#1D9E75" : "#E24B4A",
                    fontSize: 11, fontWeight: 500, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
                  {f.paid ? "Paid" : "Unpaid"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}