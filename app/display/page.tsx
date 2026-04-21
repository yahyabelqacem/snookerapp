"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";

type GameState = {
  player1_name: string;
  player2_name: string;
  score1: number;
  score2: number;
  break1: number;
  break2: number;
  best1: number;
  best2: number;
  active: number;
  timer_start: number;
  balls1: { color: string }[];
  balls2: { color: string }[];
};

type QueueEntry = {
  id: number;
  name: string;
  position: number;
};

export default function Display() {
  const [game, setGame] = useState<GameState>({
    player1_name: "Player 1",
    player2_name: "Player 2",
    score1: 0, score2: 0,
    break1: 0, break2: 0,
    best1: 0, best2: 0,
    active: 0,
    timer_start: 0,
    balls1: [],
    balls2: [],
  });

  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [elapsed, setElapsed] = useState("00:00");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  const fetchAll = async () => {
    const { data: g } = await supabase.from("game_state").select("*").eq("id", 1).single();
    if (g) setGame({
      ...g,
      balls1: Array.isArray(g.balls1) ? g.balls1 : [],
      balls2: Array.isArray(g.balls2) ? g.balls2 : [],
    });
    const { data: q } = await supabase.from("queue").select("*").order("position");
    if (q) setQueue(q);
  };

  useEffect(() => {
    fetchAll();
    const poll = setInterval(fetchAll, 2000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const ts = gameRef.current.timer_start;
      if (!ts || ts <= 0) { setElapsed("00:00"); return; }
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 0) { setElapsed("00:00"); return; }
      const mins = Math.floor(diff / 60).toString().padStart(2, "0");
      const secs = (diff % 60).toString().padStart(2, "0");
      setElapsed(`${mins}:${secs}`);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [game.timer_start]);

  const diff = Math.abs(game.score1 - game.score2);
  const leader = game.score1 === game.score2 ? null : game.score1 > game.score2 ? 0 : 1;
  const names = [game.player1_name, game.player2_name];
  const balls1 = Array.isArray(game.balls1) ? game.balls1 : [];
  const balls2 = Array.isArray(game.balls2) ? game.balls2 : [];

  const BallsRow = ({ balls }: { balls: { color: string }[] }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
      {balls.map((b, i) => (
        <div key={i} style={{
          width: 22, height: 22, borderRadius: "50%",
          background: b.color,
          border: "2px solid rgba(255,255,255,0.2)",
          flexShrink: 0
        }} />
      ))}
    </div>
  );

  return (
    <div style={{
      background: `linear-gradient(rgba(0,0,0,0.75), rgba(0,0,0,0.75)), url('/bg.jpg') center/cover no-repeat fixed`,
      minHeight: "100vh", display: "flex", fontFamily: "sans-serif"
    }}>

      {/* Queue sidebar */}
      <div style={{ width: 220, padding: "30px 16px", borderRight: "1px solid #1a1a1a",
        background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#444", textTransform: "uppercase", marginBottom: 12 }}>
          Waiting list
        </div>
        {queue.length === 0 ? (
          <div style={{ fontSize: 12, color: "#333", letterSpacing: 1 }}>Ma kayn walo...</div>
        ) : queue.map((q, idx) => (
          <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            background: idx === 0 ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${idx === 0 ? "#1D9E75" : "#1a1a1a"}` }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%",
              background: idx === 0 ? "#1D9E75" : "#2a2a36",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 500, color: "#fff", flexShrink: 0 }}>
              {idx + 1}
            </div>
            <div style={{ fontSize: 13, color: idx === 0 ? "#1D9E75" : "#666",
              textTransform: "uppercase", letterSpacing: 1 }}>
              {q.name}
            </div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>
            Welcome to
          </div>
          <div style={{ fontSize: 32, letterSpacing: 8, color: "#1D9E75", textTransform: "uppercase",
            fontWeight: 500, fontStyle: "italic" }}>
            JET7POOL
          </div>
        </div>

        {/* Scoreboard */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 20, alignItems: "start", marginBottom: 24 }}>

          {/* Player 1 */}
          <div style={{ padding: "30px 20px", borderRadius: 20, textAlign: "center",
            background: game.active === 0 ? "rgba(13,26,46,0.85)" : "rgba(23,23,31,0.85)",
            border: `3px solid ${game.active === 0 ? "#378ADD" : "#2a2a36"}` }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: game.active === 0 ? "#85B7EB" : "#555",
              textTransform: "uppercase", marginBottom: 12 }}>
              {game.player1_name}
            </div>
            {balls1.length > 0 && <BallsRow balls={balls1} />}
            <div style={{ fontSize: 110, fontWeight: 500, lineHeight: 1, color: "#fff", margin: "0 0 16px" }}>
              {game.score1}
            </div>
            <div style={{ fontSize: 15, color: "#666", marginBottom: 6 }}>
              Break: <b style={{ color: "#888", fontSize: 18 }}>{game.break1}</b>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              Highest break: <b style={{ color: "#666" }}>{game.best1}</b>
            </div>
          </div>

          {/* Diff */}
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>diff</div>
            <div style={{ fontSize: 48, fontWeight: 500, color: "#fff" }}>{diff}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 8, letterSpacing: 1 }}>
              {leader === null ? "equal" : `${names[leader]} leads`}
            </div>
          </div>

          {/* Player 2 */}
          <div style={{ padding: "30px 20px", borderRadius: 20, textAlign: "center",
            background: game.active === 1 ? "rgba(42,16,8,0.85)" : "rgba(23,23,31,0.85)",
            border: `3px solid ${game.active === 1 ? "#D85A30" : "#2a2a36"}` }}>
            <div style={{ fontSize: 18, letterSpacing: 3, color: game.active === 1 ? "#F0997B" : "#555",
              textTransform: "uppercase", marginBottom: 12 }}>
              {game.player2_name}
            </div>
            {balls2.length > 0 && <BallsRow balls={balls2} />}
            <div style={{ fontSize: 110, fontWeight: 500, lineHeight: 1, color: "#fff", margin: "0 0 16px" }}>
              {game.score2}
            </div>
            <div style={{ fontSize: 15, color: "#666", marginBottom: 6 }}>
              Break: <b style={{ color: "#888", fontSize: 18 }}>{game.break2}</b>
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              Highest break: <b style={{ color: "#666" }}>{game.best2}</b>
            </div>
          </div>

        </div>

        {/* Active + Timer */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
            Active: <b style={{ color: "#aaa" }}>{names[game.active]}</b>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(0,0,0,0.4)", borderRadius: 20, padding: "8px 20px",
            border: "1px solid rgba(245,196,0,0.3)" }}>
            <span style={{ fontSize: 16 }}>⏱</span>
            <span style={{ fontSize: 22, fontWeight: 500, color: "#F5C400", letterSpacing: 3, fontVariantNumeric: "tabular-nums" }}>
              {elapsed}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}