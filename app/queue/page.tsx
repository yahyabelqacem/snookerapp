"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import Link from "next/link";

type QueueEntry = {
  id: number;
  name: string;
  position: number;
  created_at: string;
};

export default function Queue() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
    const channel = supabase
      .channel("queue_changes")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "queue"
      }, () => fetchQueue())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchQueue = async () => {
    const { data } = await supabase.from("queue").select("*").order("position");
    if (data) setQueue(data);
  };

  const joinQueue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    const maxPos = queue.length > 0 ? Math.max(...queue.map(q => q.position)) : 0;
    await supabase.from("queue").insert({ name: name.trim(), position: maxPos + 1 });
    setName("");
    setLoading(false);
  };

  const leaveQueue = async (id: number) => {
    await supabase.from("queue").delete().eq("id", id);
  };

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: "28px 24px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Link href="/" style={{ color: "#555", fontSize: 13, textDecoration: "none", letterSpacing: 1 }}>
            Back
          </Link>
          <h2 style={{ fontSize: 13, letterSpacing: 3, color: "#4a4a5a", textTransform: "uppercase" }}>
            Queue
          </h2>
          <div style={{ width: 40 }} />
        </div>

        {/* Join form */}
        <div style={{ background: "#17171f", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid #2a2a36" }}>
          <div style={{ fontSize: 11, color: "#444", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>
            Join the queue
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && joinQueue()}
              placeholder="Isem dyalk..."
              style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a36",
                background: "#0d0d0f", color: "#fff", fontSize: 14, outline: "none" }}
            />
            <button onClick={joinQueue} disabled={loading || !name.trim()}
              style={{ padding: "10px 18px", borderRadius: 10, border: "none",
                background: name.trim() ? "#1D9E75" : "#2a2a36",
                color: name.trim() ? "#fff" : "#555", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
              Join
            </button>
          </div>
        </div>

        {/* Queue list */}
        {queue.length === 0 ? (
          <div style={{ textAlign: "center", color: "#333", fontSize: 13, marginTop: 40, letterSpacing: 1 }}>
            Ma kayn walo mazal...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {queue.map((q, idx) => (
              <div key={q.id}
                style={{ background: "#17171f", borderRadius: 12, padding: "14px 16px",
                  border: `1px solid ${idx === 0 ? "#1a3a1a" : "#2a2a36"}`,
                  display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%",
                  background: idx === 0 ? "#1D9E75" : "#2a2a36",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 500, color: idx === 0 ? "#fff" : "#555", flexShrink: 0 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: 14, color: idx === 0 ? "#fff" : "#888",
                  textTransform: "uppercase", letterSpacing: 1 }}>
                  {q.name}
                </div>
                <button onClick={() => leaveQueue(q.id)}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #3a1a1a",
                    background: "#1a0808", color: "#E24B4A", fontSize: 12, cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}