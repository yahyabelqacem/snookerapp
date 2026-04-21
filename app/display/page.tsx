"use client";
import { useEffect, useState } from "react";
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
};

export default function Display() {
  const [game, setGame] = useState<GameState>({
    player1_name: "Player 1",
    player2_name: "Player 2",
    score1: 0, score2: 0,
    break1: 0, break2: 0,
    best1: 0, best2: 0,
    active: 0,
  });

  useEffect(() => {
    supabase.from("game_state").select("*").eq("id", 1).single()
      .then(({ data }) => { if (data) setGame(data); });

    const channel = supabase
      .channel("game_state_changes")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "game_state"
      }, (payload) => {
        setGame(payload.new as GameState);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const diff = Math.abs(game.score1 - game.score2);
  const leader = game.score1 === game.score2 ? null : game.score1 > game.score2 ? 0 : 1;
  const names = [game.player1_name, game.player2_name];

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px", fontFamily: "sans-serif" }}>

      <div style={{ textAlign: "center", fontSize: 12, letterSpacing: 4, color: "#333", textTransform: "uppercase", marginBottom: 40 }}>
        Snooker Score
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 20, alignItems: "center", marginBottom: 40 }}>

        {/* Player 1 */}
        <div style={{ padding: "40px 20px", borderRadius: 20, textAlign: "center",
          background: game.active === 0 ? "#0d1a2e" : "#17171f",
          border: `3px solid ${game.active === 0 ? "#378ADD" : "#2a2a36"}` }}>
          <div style={{ fontSize: 18, letterSpacing: 3, color: game.active === 0 ? "#85B7EB" : "#555", textTransform: "uppercase", marginBottom: 16 }}>
            {game.player1_name}
          </div>
          <div style={{ fontSize: 120, fontWeight: 500, lineHeight: 1, color: "#fff", margin: "0 0 20px" }}>
            {game.score1}
          </div>
          <div style={{ fontSize: 16, color: "#444", marginBottom: 8 }}>
            Break: <b style={{ color: "#666", fontSize: 20 }}>{game.break1}</b>
          </div>
          <div style={{ fontSize: 13, color: "#333" }}>
            Highest break: <b style={{ color: "#555" }}>{game.best1}</b>
          </div>
        </div>

        {/* Diff */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "#2a2a36", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>diff</div>
          <div style={{ fontSize: 48, fontWeight: 500, color: "#fff" }}>{diff}</div>
          <div style={{ fontSize: 11, color: "#333", marginTop: 8, letterSpacing: 1 }}>
            {leader === null ? "equal" : `${names[leader]} leads`}
          </div>
        </div>

        {/* Player 2 */}
        <div style={{ padding: "40px 20px", borderRadius: 20, textAlign: "center",
          background: game.active === 1 ? "#2a1008" : "#17171f",
          border: `3px solid ${game.active === 1 ? "#D85A30" : "#2a2a36"}` }}>
          <div style={{ fontSize: 18, letterSpacing: 3, color: game.active === 1 ? "#F0997B" : "#555", textTransform: "uppercase", marginBottom: 16 }}>
            {game.player2_name}
          </div>
          <div style={{ fontSize: 120, fontWeight: 500, lineHeight: 1, color: "#fff", margin: "0 0 20px" }}>
            {game.score2}
          </div>
          <div style={{ fontSize: 16, color: "#444", marginBottom: 8 }}>
            Break: <b style={{ color: "#666", fontSize: 20 }}>{game.break2}</b>
          </div>
          <div style={{ fontSize: 13, color: "#333" }}>
            Highest break: <b style={{ color: "#555" }}>{game.best2}</b>
          </div>
        </div>

      </div>

      <div style={{ textAlign: "center", fontSize: 14, color: "#2a2a36", letterSpacing: 2, textTransform: "uppercase" }}>
        Active: <b style={{ color: "#444" }}>{names[game.active]}</b>
      </div>
    </div>
  );
}
