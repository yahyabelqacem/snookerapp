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

const BALL_COLORS: Record<string, string> = {
  "#993C1D": "#CC0000",
  "#F5C400": "#FFD700",
  "#1D9E75": "#007A33",
  "#5c3018": "#6B3A2A",
  "#185FA5": "#1E5FA8",
  "#993556": "#E8729A",
  "#2a2a36": "#111111",
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

  const getRealColor = (color: string) => BALL_COLORS[color] || color;

  const BallsRow = ({ balls }: { balls: { color: string }[] }) => (
    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
      {balls.map((b, i) => {
        const c = getRealColor(b.color);
        return (
          <div key={i} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, white 2%, ${c}ff 40%, ${c}88 100%)`,
            border: "2px solid rgba(255,255,255,0.5)",
            boxShadow: `0 0 12px ${c}cc, 0 2px 8px rgba(0,0,0,0.6)`,
            filter: "brightness(1.2) saturate(1.3)",
            flexShrink: 0
          }} />
        );
      })}
    </div>
  );

  return (
    <div style={{
      background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/bg.jpg') center/cover no-repeat fixed`,
      minHeight: "100vh", display: "flex", fontFamily: "'Segoe UI', sans-serif", overflow: "hidden"
    }}>

      {/* Queue sidebar */}
      <div style={{
        width: 200, padding: "24px 14px",
        background: "rgba(0,0,0,0.6)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column", gap: 8
      }}>
        <div style={{
          fontSize: 9, letterSpacing: 4, color: "#555",
          textTransform: "uppercase", marginBottom: 16,
          borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: 10
        }}>
          Waiting list
        </div>
        {queue.length === 0 ? (
          <div style={{ fontSize: 12, color: "#333" }}>—</div>
        ) : queue.map((q, idx) => (
          <div key={q.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 10,
            background: idx === 0 ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.02)",
            border: `1px solid ${idx === 0 ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.04)"}`,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: "50%",
              background: idx === 0 ? "#1D9E75" : "#1a1a1a",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 600, color: "#fff", flexShrink: 0,
              border: idx === 0 ? "none" : "1px solid #2a2a2a"
            }}>
              {idx + 1}
            </div>
            <div style={{
              fontSize: 12, color: idx === 0 ? "#1D9E75" : "#555",
              textTransform: "uppercase", letterSpacing: 1, fontWeight: idx === 0 ? 600 : 400
            }}>
              {q.name}
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 48px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            fontSize: 13, color: "rgba(255,255,255,0.3)",
            fontStyle: "italic", letterSpacing: 6, marginBottom: 4,
            fontFamily: "Georgia, serif"
          }}>
            𝓦𝓮𝓵𝓬𝓸𝓶𝓮 𝓽𝓸
          </div>
          <div style={{
            fontSize: "clamp(40px, 5vw, 80px)",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontWeight: 700,
            letterSpacing: 8,
            background: "linear-gradient(135deg, #888 0%, #fff 40%, #aaa 60%, #1E5FA8 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1,
          }}>
            𝒥𝐸𝒯7𝒫𝒪𝒪𝐿
          </div>
        </div>

        {/* Scoreboard */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 1fr", gap: 16, alignItems: "center", marginBottom: 24 }}>

          {/* Player 1 */}
          <div style={{
            padding: "28px 24px", borderRadius: 20, textAlign: "center",
            background: game.active === 0
              ? "linear-gradient(145deg, rgba(13,26,46,0.95), rgba(20,40,70,0.9))"
              : "rgba(15,15,20,0.7)",
            border: `2px solid ${game.active === 0 ? "#378ADD" : "rgba(255,255,255,0.05)"}`,
            boxShadow: game.active === 0 ? "0 0 30px rgba(55,138,221,0.2)" : "none",
            transition: "all 0.3s"
          }}>
            <div style={{
              fontSize: 14, letterSpacing: 4, color: game.active === 0 ? "#85B7EB" : "#444",
              textTransform: "uppercase", marginBottom: 12, fontWeight: 600
            }}>
              {game.player1_name}
            </div>
            {balls1.length > 0 && <BallsRow balls={balls1} />}
            <div style={{
              fontSize: "clamp(70px, 9vw, 120px)", fontWeight: 700,
              lineHeight: 1, color: "#fff", margin: "0 0 16px",
              textShadow: game.active === 0 ? "0 0 40px rgba(55,138,221,0.4)" : "none"
            }}>
              {game.score1}
            </div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
              Break <span style={{ color: game.active === 0 ? "#85B7EB" : "#666", fontSize: 16, fontWeight: 600 }}>{game.break1}</span>
            </div>
            <div style={{ fontSize: 11, color: "#333" }}>
              Best <span style={{ color: "#555" }}>{game.best1}</span>
            </div>
          </div>

          {/* Center */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>diff</div>
            <div style={{
              fontSize: 42, fontWeight: 700, color: diff > 0 ? "#fff" : "#333",
              lineHeight: 1, marginBottom: 6
            }}>
              {diff}
            </div>
            <div style={{ fontSize: 10, color: "#444", letterSpacing: 1 }}>
              {leader === null ? "equal" : `${names[leader]}`}
            </div>
            <div style={{ fontSize: 9, color: "#333", marginTop: 2 }}>
              {leader !== null ? "leads" : ""}
            </div>
          </div>

          {/* Player 2 */}
          <div style={{
            padding: "28px 24px", borderRadius: 20, textAlign: "center",
            background: game.active === 1
              ? "linear-gradient(145deg, rgba(42,16,8,0.95), rgba(60,20,10,0.9))"
              : "rgba(15,15,20,0.7)",
            border: `2px solid ${game.active === 1 ? "#D85A30" : "rgba(255,255,255,0.05)"}`,
            boxShadow: game.active === 1 ? "0 0 30px rgba(216,90,48,0.2)" : "none",
            transition: "all 0.3s"
          }}>
            <div style={{
              fontSize: 14, letterSpacing: 4, color: game.active === 1 ? "#F0997B" : "#444",
              textTransform: "uppercase", marginBottom: 12, fontWeight: 600
            }}>
              {game.player2_name}
            </div>
            {balls2.length > 0 && <BallsRow balls={balls2} />}
            <div style={{
              fontSize: "clamp(70px, 9vw, 120px)", fontWeight: 700,
              lineHeight: 1, color: "#fff", margin: "0 0 16px",
              textShadow: game.active === 1 ? "0 0 40px rgba(216,90,48,0.4)" : "none"
            }}>
              {game.score2}
            </div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
              Break <span style={{ color: game.active === 1 ? "#F0997B" : "#666", fontSize: 16, fontWeight: 600 }}>{game.break2}</span>
            </div>
            <div style={{ fontSize: 11, color: "#333" }}>
              Best <span style={{ color: "#555" }}>{game.best2}</span>
            </div>
          </div>

        </div>

        {/* Active + Timer */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "#444", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            Active: <span style={{ color: "#777" }}>{names[game.active]}</span>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(0,0,0,0.5)", borderRadius: 30, padding: "10px 24px",
            border: "1px solid rgba(245,196,0,0.2)",
            boxShadow: "0 0 20px rgba(245,196,0,0.1)"
          }}>
            <span style={{ fontSize: 14, color: "#F5C400" }}>⏱</span>
            <span style={{
              fontSize: 26, fontWeight: 600, color: "#F5C400",
              letterSpacing: 4, fontVariantNumeric: "tabular-nums",
              fontFamily: "monospace"
            }}>
              {elapsed}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}