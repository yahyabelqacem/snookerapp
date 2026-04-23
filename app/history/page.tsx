"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
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
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [frames9, setFrames9] = useState<Frame[]>([]);
  const [frames10, setFrames10] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid">("all");
  const router = useRouter();

  const checkPin = () => {
    if (pin === "2026") {
      setUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin("");
    }
  };

  useEffect(() => {
    if (unlocked) fetchFrames();
  }, [unlocked]);

  const fetchFrames = async () => {
    setLoading(true);
    const { data: d9 } = await supabase.from("frames").select("*").eq("table_id", 9).order("created_at", { ascending: false });
    const { data: d10 } = await supabase.from("frames").select("*").eq("table_id", 10).order("created_at", { ascending: false });
    if (d9) setFrames9(d9);
    if (d10) setFrames10(d10);
    setLoading(false);
  };

  const togglePaid = async (id: string, paid: boolean, tableId: number) => {
    await supabase.from("frames").update({ paid: !paid }).eq("id", id);
    if (tableId === 9) setFrames9(f => f.map(fr => fr.id === id ? { ...fr, paid: !paid } : fr));
    else setFrames10(f => f.map(fr => fr.id === id ? { ...fr, paid: !paid } : fr));
  };

  const deleteFrame = async (id: string, tableId: number) => {
    await supabase.from("frames").delete().eq("id", id);
    if (tableId === 9) setFrames9(f => f.filter(fr => fr.id !== id));
    else setFrames10(f => f.filter(fr => fr.id !== id));
  };

  const filterFrames = (frames: Frame[]) =>
    filter === "unpaid" ? frames.filter(f => !f.paid) : frames;

  const allFrames = [...frames9, ...frames10];
  const unpaidCount = allFrames.filter(f => !f.paid).length;

  // PIN Screen
  if (!unlocked) {
    return (
      <div style={{ background: "#0d0d0f", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ background: "#17171f", borderRadius: 20, padding: 40, maxWidth: 320, width: "90%", border: "1px solid #2a2a36", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
          <div style={{ fontSize: 14, color: "#aaa", letterSpacing: 2, textTransform: "uppercase", marginBottom: 24 }}>
            Enter PIN
          </div>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={e => { setPin(e.target.value); setPinError(false); }}
            onKeyDown={e => e.key === "Enter" && checkPin()}
            placeholder="••••"
            style={{
              width: "100%", padding: "14px 20px", borderRadius: 12,
              border: `1px solid ${pinError ? "#E24B4A" : "#2a2a36"}`,
              background: "#0d0d0f", color: "#fff", fontSize: 24,
              textAlign: "center", letterSpacing: 8, outline: "none",
              boxSizing: "border-box"
            }}
          />
          {pinError && (
            <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 8 }}>PIN ghalat ❌</div>
          )}
          <button onClick={checkPin}
            style={{ marginTop: 16, width: "100%", padding: 14, borderRadius: 12, border: "1px solid #1a3a1a", background: "#0a1a0a", color: "#1D9E75", fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: 1 }}>
            Confirm
          </button>
        </div>
      </div>
    );
  }

  const FrameCard = ({ frame }: { frame: Frame }) => (
    <div style={{
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
        <div style={{ fontSize: 11, color: "#444" }}>{frame.date}</div>
      </div>
      <button onClick={() => togglePaid(frame.id, frame.paid, frame.table_id)}
        style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${frame.paid ? "rgba(29,158,117,0.3)" : "rgba(226,75,74,0.3)"}`, background: frame.paid ? "rgba(29,158,117,0.1)" : "rgba(226,75,74,0.1)", color: frame.paid ? "#1D9E75" : "#E24B4A", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
        {frame.paid ? "✓ Paid" : "Unpaid"}
      </button>
      <button onClick={() => deleteFrame(frame.id, frame.table_id)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #2a2a36", background: "transparent", color: "#444", fontSize: 12, cursor: "pointer" }}>
        ✕
      </button>
    </div>
  );

  const TableSection = ({ title, frames }: { title: string; frames: Frame[] }) => {
    const filtered = filterFrames(frames);
    const unpaid = frames.filter(f => !f.paid).length;
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid #1a1a1a" }}>
          <span style={{ fontSize: 13, letterSpacing: 3, color: "#4a4a5a", textTransform: "uppercase" }}>{title}</span>
          {unpaid > 0 && <span style={{ fontSize: 11, color: "#E24B4A" }}>{unpaid} unpaid</span>}
          <span style={{ fontSize: 11, color: "#333", marginLeft: "auto" }}>{frames.length} frames</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#333", padding: 20, fontSize: 13 }}>Ma kayn walo...</div>
          ) : filtered.map(frame => <FrameCard key={frame.id} frame={frame} />)}
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: "28px 24px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 700, margin: "0 auto 24px" }}>
        <div>
          <h2 style={{ fontSize: 13, letterSpacing: 3, color: "#4a4a5a", textTransform: "uppercase", margin: 0 }}>History</h2>
          {unpaidCount > 0 && <div style={{ fontSize: 11, color: "#E24B4A", marginTop: 4 }}>{unpaidCount} unpaid total</div>}
        </div>
        <button onClick={() => router.back()}
          style={{ background: "transparent", border: "1px solid #2a2a36", borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer", padding: "6px 12px" }}>
          ← Back
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, maxWidth: 700, margin: "0 auto 24px" }}>
        <button onClick={() => setFilter("all")}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${filter === "all" ? "#1D9E75" : "#2a2a36"}`, background: filter === "all" ? "rgba(29,158,117,0.1)" : "transparent", color: filter === "all" ? "#1D9E75" : "#555", fontSize: 12, cursor: "pointer" }}>
          All ({allFrames.length})
        </button>
        <button onClick={() => setFilter("unpaid")}
          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${filter === "unpaid" ? "#E24B4A" : "#2a2a36"}`, background: filter === "unpaid" ? "rgba(226,75,74,0.1)" : "transparent", color: filter === "unpaid" ? "#E24B4A" : "#555", fontSize: 12, cursor: "pointer" }}>
          Unpaid ({unpaidCount})
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "#333", padding: 40 }}>Loading...</div>
        ) : (
          <>
            <TableSection title="Table 9" frames={frames9} />
            <TableSection title="Table 10" frames={frames10} />
          </>
        )}
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