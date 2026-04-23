"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../lib/supabase";

type Frame = {
  id: string;
  table_id: number;
  winner: string;
  loser: string;
  winner_score: number;
  loser_score: number;
  date: string;
  paid: boolean;
};

function HistoryContent() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");

  useEffect(() => {
    fetchFrames();
  }, [tableId]);

  const fetchFrames = async () => {
    setLoading(true);
    let query = supabase.from("frames").select("*").order("created_at", { ascending: false });
    if (tableId) query = query.eq("table_id", parseInt(tableId));
    const { data } = await query;
    if (data) setFrames(data);
    setLoading(false);
  };

  const togglePaid = async (id: string, paid: boolean) => {
    await supabase.from("frames").update({ paid: !paid }).eq("id", id);
    setFrames(f => f.map(fr => fr.id === id ? { ...fr, paid: !paid } : fr));
  };

  const deleteFrame = async (id: string) => {
    await supabase.from("frames").delete().eq("id", id);
    setFrames(f => f.filter(fr => fr.id !== id));
  };

  const filtered = filter === "unpaid" ? frames.filter(f => !f.paid) : frames;
  const unpaidCount = frames.filter(f => !f.paid).length;

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: "28px 24px", fontFamily: "sans-serif" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 700, margin: "0 auto 24px" }}>
        <div>
          <h2 style={{ fontSize: 13, letterSpacing: 3, color: "#4a4a5a", textTransform: "uppercase", margin: 0 }}>
            History {tableId ? `— Table ${tableId}` : "— All Tables"}
          </h2>
          {unpaidCount > 0 && (
            <div style={{ fontSize: 11, color: "#E24B4A", marginTop: 4 }}>{unpaidCount} unpaid</div>
          )}
        </div>
        <button onClick={() => router.back()}
          style={{ background: "transparent", border: "1px solid #2a2a36", borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer", padding: "6px 12px" }}>
          ← Back
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, maxWidth: 700, margin: "0 auto 20px" }}>
        <button onClick={() => setFilter("all")}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${filter === "all" ? "#1D9E75" : "#2a2a36"}`, background: filter === "all" ? "rgba(29,158,117,0.1)" : "transparent", color: filter === "all" ? "#1D9E75" : "#555", fontSize: 12, cursor: "pointer" }}>
          All ({frames.length})
        </button>
        <button onClick={() => setFilter("unpaid")}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${filter === "unpaid" ? "#E24B4A" : "#2a2a36"}`, background: filter === "unpaid" ? "rgba(226,75,74,0.1)" : "transparent", color: filter === "unpaid" ? "#E24B4A" : "#555", fontSize: 12, cursor: "pointer" }}>
          Unpaid ({unpaidCount})
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#333", padding: 40 }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", color: "#333", padding: 40 }}>Ma kayn walo...</div>
        ) : filtered.map(frame => (
          <div key={frame.id} style={{
            padding: "16px 20px", borderRadius: 14,
            background: frame.paid ? "rgba(29,158,117,0.05)" : "rgba(226,75,74,0.05)",
            border: `1px solid ${frame.paid ? "rgba(29,158,117,0.2)" : "rgba(226,75,74,0.2)"}`,
            display: "flex", alignItems: "center", gap: 12
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, color: "#1D9E75", fontWeight: 500 }}>{frame.winner}</span>
                <span style={{ fontSize: 12, color: "#555" }}>{frame.winner_score} — {frame.loser_score}</span>
                <span style={{ fontSize: 14, color: "#888" }}>{frame.loser}</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <span style={{ fontSize: 11, color: "#444" }}>{frame.date}</span>
                <span style={{ fontSize: 11, color: "#333" }}>Table {frame.table_id}</span>
              </div>
            </div>
            <button onClick={() => togglePaid(frame.id, frame.paid)}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${frame.paid ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`, background: frame.paid ? "rgba(29,158,117,0.1)" : "rgba(226,75,74,0.1)", color: frame.paid ? "#1D9E75" : "#E24B4A", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
              {frame.paid ? "✓ Paid" : "Unpaid"}
            </button>
            <button onClick={() => deleteFrame(frame.id)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2a2a36", background: "transparent", color: "#444", fontSize: 12, cursor: "pointer" }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function History() {
  return (
    <Suspense fallback={<div style={{ background: "#0d0d0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#444" }}>Loading...</div>}>
      <HistoryContent />
    </Suspense>
  );
}