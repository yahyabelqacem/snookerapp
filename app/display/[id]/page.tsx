"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabase";

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
  game_started: boolean;
};

type QueueEntry = {
  id: number;
  name: string;
  position: number;
  table_id: number;
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

export default function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const [tableId, setTableId] = useState(0);
  const [game, setGame] = useState<GameState>({
    player1_name: "Player 1", player2_name: "Player 2",
    score1: 0, score2: 0, break1: 0, break2: 0, best1: 0, best2: 0,
    active: 0, timer_start: 0, balls1: [], balls2: [], game_started: false,
  });
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [elapsed, setElapsed] = useState("00:00");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;

  useEffect(() => {
    params.then(p => setTableId(parseInt(p.id)));
  }, []);

  useEffect(() => {
    const goFullscreen = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
        setIsFullscreen(true);
      }
    };
    document.addEventListener("click", goFullscreen, { once: true });
    return () => document.removeEventListener("click", goFullscreen);
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const fetchAll = async (tid: number) => {
    const { data: g } = await supabase.from("game_state").select("*").eq("id", tid).single();
    if (g) setGame({
      ...g,
      balls1: Array.isArray(g.balls1) ? g.balls1 : [],
      balls2: Array.isArray(g.balls2) ? g.balls2 : [],
      game_started: g.game_started || false,
    });
    const { data: q } = await supabase.from("queue").select("*").eq("table_id", tid).order("position");
    if (q) setQueue(q);
  };

  useEffect(() => {
    if (!tableId) return;
    fetchAll(tableId);
    pollRef.current = setInterval(() => fetchAll(tableId), 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [tableId]);

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
    <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", overflowY: "hidden", maxWidth: "100%", padding: "4px 2px", scrollbarWidth: "none", flexWrap: "nowrap" }}>
      {balls.map((b, i) => {
        const c = getRealColor(b.color);
        return (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, white 2%, ${c}ff 40%, ${c}88 100%)`,
            border: "2px solid rgba(255,255,255,0.5)",
            boxShadow: `0 0 10px ${c}cc`,
            filter: "brightness(1.2) saturate(1.3)",
            flexShrink: 0
          }} />
        );
      })}
    </div>
  );

  if (!tableId) return <div style={{ background: "#0d0d0f", minHeight: "100vh" }} />;

  // Waiting screen
  if (!game.game_started) {
    return (
      <div style={{
        background: `linear-gradient(rgba(0,0,0,0.88), rgba(0,0,0,0.88)), url('/bg.jpg') center/cover no-repeat fixed`,
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes pulse { 0%,100% { opacity:0.3; } 50% { opacity:1; } }
        `}</style>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: "clamp(70px, 10vw, 140px)",
            fontFamily: "'Times New Roman', serif",
            fontWeight: 900, fontStyle: "italic", letterSpacing: 10, lineHeight: 1,
            background: "linear-gradient(180deg, #ffffff 0%, #d4af37 40%, #ffffff 60%, #b8860b 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 30px rgba(212,175,55,0.5))",
            marginBottom: 20
          }}>
            JET7POOL
          </div>
          <div style={{
            display: "inline-block",
            background: "rgba(55,138,221,0.15)",
            border: "1px solid rgba(55,138,221,0.3)",
            borderRadius: 20, padding: "6px 24px",
            fontSize: 14, color: "#85B7EB", letterSpacing: 4,
            textTransform: "uppercase", marginBottom: 50
          }}>
            Table {tableId}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "3px solid rgba(212,175,55,0.2)",
              borderTop: "3px solid rgba(212,175,55,0.8)",
              animation: "spin 1.2s linear infinite",
            }} />
            <div style={{ fontSize: 16, color: "#555", letterSpacing: 5, textTransform: "uppercase" }}>
              Waiting for players
            </div>
          </div>

          {queue.length > 0 && (
            <div style={{ marginTop: 48, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={{ width: "100%", fontSize: 10, color: "#333", letterSpacing: 4, textTransform: "uppercase", marginBottom: 12 }}>
                In queue
              </div>
              {queue.map((q, idx) => (
                <div key={q.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 20px", borderRadius: 20,
                  background: idx === 0 ? "rgba(29,158,117,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${idx === 0 ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.06)"}`,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: idx === 0 ? "#1D9E75" : "#1a1a1a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 600, color: "#fff"
                  }}>{idx + 1}</div>
                  <span style={{ fontSize: 14, color: idx === 0 ? "#1D9E75" : "#444", textTransform: "uppercase", letterSpacing: 2 }}>
                    {q.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url('/bg.jpg') center/cover no-repeat fixed`,
      minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Segoe UI', sans-serif", overflow: "hidden",
      cursor: isFullscreen ? "none" : "default",
    }}>

      {!isFullscreen && (
        <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100, background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: "8px 14px", fontSize: 11, color: "#555", letterSpacing: 1, border: "1px solid #2a2a36" }}>
          Click anywhere for fullscreen
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 56px" }}>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{
            fontSize: "clamp(50px, 7vw, 100px)",
            fontFamily: "'Times New Roman', serif",
            fontWeight: 900, fontStyle: "italic", letterSpacing: 10, lineHeight: 1,
            background: "linear-gradient(180deg, #ffffff 0%, #d4af37 40%, #ffffff 60%, #b8860b 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 20px rgba(212,175,55,0.4))",
            textTransform: "uppercase",
          }}>
            JET7POOL
          </div>
          <div style={{ fontSize: 11, color: "#444", letterSpacing: 4, textTransform: "uppercase", marginTop: 4 }}>
            Table {tableId}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 1fr", gap: 20, alignItems: "center", marginBottom: 20 }}>

          <div style={{
            padding: "28px 28px", borderRadius: 20, textAlign: "center",
            background: game.active === 0 ? "linear-gradient(145deg, rgba(13,26,46,0.95), rgba(20,40,70,0.9))" : "rgba(15,15,20,0.7)",
            border: `2px solid ${game.active === 0 ? "#378ADD" : "rgba(255,255,255,0.05)"}`,
            boxShadow: game.active === 0 ? "0 0 40px rgba(55,138,221,0.25)" : "none",
            overflow: "hidden",
          }}>
            <div style={{ fontSize: 20, letterSpacing: 4, color: game.active === 0 ? "#85B7EB" : "#444", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>
              {game.player1_name}
            </div>
            {balls1.length > 0 && <BallsRow balls={balls1} />}
            <div style={{ fontSize: "clamp(90px, 12vw, 160px)", fontWeight: 700, lineHeight: 1, color: "#fff", margin: "0 0 16px", textShadow: game.active === 0 ? "0 0 50px rgba(55,138,221,0.5)" : "none" }}>
              {game.score1}
            </div>
            <div style={{ fontSize: 16, color: "#555", marginBottom: 4 }}>
              Break <span style={{ color: game.active === 0 ? "#85B7EB" : "#666", fontSize: 20, fontWeight: 600 }}>{game.break1}</span>
            </div>
            <div style={{ fontSize: 13, color: "#333" }}>
              Best <span style={{ color: "#555", fontSize: 15 }}>{game.best1}</span>
            </div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#333", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>diff</div>
            <div style={{ fontSize: 72, fontWeight: 900, color: diff > 0 ? "#fff" : "#333", lineHeight: 1, marginBottom: 8 }}>{diff}</div>
            <div style={{ fontSize: 11, color: "#444", letterSpacing: 1 }}>{leader === null ? "equal" : `${names[leader]}`}</div>
            <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>{leader !== null ? "leads" : ""}</div>
          </div>

          <div style={{
            padding: "28px 28px", borderRadius: 20, textAlign: "center",
            background: game.active === 1 ? "linear-gradient(145deg, rgba(42,16,8,0.95), rgba(60,20,10,0.9))" : "rgba(15,15,20,0.7)",
            border: `2px solid ${game.active === 1 ? "#D85A30" : "rgba(255,255,255,0.05)"}`,
            boxShadow: game.active === 1 ? "0 0 40px rgba(216,90,48,0.25)" : "none",
            overflow: "hidden",
          }}>
            <div style={{ fontSize: 20, letterSpacing: 4, color: game.active === 1 ? "#F0997B" : "#444", textTransform: "uppercase", marginBottom: 12, fontWeight: 600 }}>
              {game.player2_name}
            </div>
            {balls2.length > 0 && <BallsRow balls={balls2} />}
            <div style={{ fontSize: "clamp(90px, 12vw, 160px)", fontWeight: 700, lineHeight: 1, color: "#fff", margin: "0 0 16px", textShadow: game.active === 1 ? "0 0 50px rgba(216,90,48,0.5)" : "none" }}>
              {game.score2}
            </div>
            <div style={{ fontSize: 16, color: "#555", marginBottom: 4 }}>
              Break <span style={{ color: game.active === 1 ? "#F0997B" : "#666", fontSize: 20, fontWeight: 600 }}>{game.break2}</span>
            </div>
            <div style={{ fontSize: 13, color: "#333" }}>
              Best <span style={{ color: "#555", fontSize: 15 }}>{game.best2}</span>
            </div>
          </div>

        </div>

        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#444", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>
            Active: <span style={{ color: "#777" }}>{names[game.active]}</span>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "rgba(0,0,0,0.5)", borderRadius: 30, padding: "10px 28px", border: "1px solid rgba(245,196,0,0.2)", boxShadow: "0 0 20px rgba(245,196,0,0.1)" }}>
            <span style={{ fontSize: 16, color: "#F5C400" }}>⏱</span>
            <span style={{ fontSize: 28, fontWeight: 600, color: "#F5C400", letterSpacing: 4, fontVariantNumeric: "tabular-nums", fontFamily: "monospace" }}>
              {elapsed}
            </span>
          </div>
        </div>

      </div>

      {queue.length > 0 && (
        <div style={{ padding: "14px 56px", background: "rgba(0,0,0,0.6)", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 16, flexWrap: "nowrap", overflowX: "auto" }}>
          <div style={{ fontSize: 9, letterSpacing: 4, color: "#444", textTransform: "uppercase", flexShrink: 0 }}>Waiting:</div>
          {queue.map((q, idx) => (
            <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: idx === 0 ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${idx === 0 ? "rgba(29,158,117,0.4)" : "rgba(255,255,255,0.06)"}`, flexShrink: 0 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: idx === 0 ? "#1D9E75" : "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, color: "#fff" }}>
                {idx + 1}
              </div>
              <span style={{ fontSize: 13, color: idx === 0 ? "#1D9E75" : "#555", textTransform: "uppercase", letterSpacing: 1, fontWeight: idx === 0 ? 600 : 400 }}>
                {q.name}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}