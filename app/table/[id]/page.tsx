"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const BALLS = [
  { name: "RED", pts: 1, color: "#993C1D" },
  { name: "YELLOW", pts: 2, color: "#F5C400" },
  { name: "GREEN", pts: 3, color: "#1D9E75" },
  { name: "BROWN", pts: 4, color: "#5c3018" },
  { name: "BLUE", pts: 5, color: "#185FA5" },
  { name: "PINK", pts: 6, color: "#993556" },
  { name: "BLACK", pts: 7, color: "#2a2a36" },
];

type HistoryEntry = {
  player: number;
  pts: number;
  breakBefore: number;
  bestBefore: number;
  isEndBreak: boolean;
};

type QueueEntry = {
  id: number;
  name: string;
  position: number;
  table_id: number;
};

type BallEntry = { color: string };

const RESERVED = ["player 1", "player 2", "player1", "player2", "p1", "p2"];

function isValidName(name: string) {
  return name.trim().length >= 2 && !RESERVED.includes(name.trim().toLowerCase());
}

export default function TablePage({ params }: { params: Promise<{ id: string }> }) {
  const [tableId, setTableId] = useState(0);
  const [scores, setScores] = useState([0, 0]);
  const [breaks, setBreaks] = useState([0, 0]);
  const [bests, setBests] = useState([0, 0]);
  const [active, setActiveState] = useState(0);
  const [name1, setName1] = useState("");
  const [name2, setName2] = useState("");
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tempName1, setTempName1] = useState("");
  const [tempName2, setTempName2] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [timerStart, setTimerStart] = useState(Date.now());
  const [showConfirm, setShowConfirm] = useState(false);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [queueName, setQueueName] = useState("");
  const [showQueue, setShowQueue] = useState(false);

  const breaksRef = useRef([0, 0]);
  const bestsRef = useRef([0, 0]);
  const balls1Ref = useRef<BallEntry[]>([]);
  const balls2Ref = useRef<BallEntry[]>([]);
  const timerStartRef = useRef(Date.now());
  const router = useRouter();
  const names = [name1, name2];

  useEffect(() => {
    params.then(p => setTableId(parseInt(p.id)));
  }, []);

  useEffect(() => {
    if (!tableId) return;
    supabase.from("game_state").select("*").eq("id", tableId).single()
      .then(({ data }) => {
        if (data) {
          setScores([data.score1, data.score2]);
          setBreaks([data.break1, data.break2]);
          setBests([data.best1, data.best2]);
          setActiveState(data.active);
          setTimerStart(data.timer_start || Date.now());
          timerStartRef.current = data.timer_start || Date.now();
          breaksRef.current = [data.break1, data.break2];
          bestsRef.current = [data.best1, data.best2];
          balls1Ref.current = Array.isArray(data.balls1) ? data.balls1 : [];
          balls2Ref.current = Array.isArray(data.balls2) ? data.balls2 : [];
          if (isValidName(data.player1_name || "") && isValidName(data.player2_name || "")) {
            setName1(data.player1_name);
            setName2(data.player2_name);
            setStarted(true);
          }
        }
        setLoading(false);
      });
    fetchQueue();
    const channel = supabase
      .channel(`queue_changes_${tableId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => fetchQueue())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tableId]);

  const fetchQueue = async () => {
    if (!tableId) return;
    const { data } = await supabase.from("queue").select("*").eq("table_id", tableId).order("position");
    if (data) setQueue(data);
  };

  const startGame = async () => {
    if (!isValidName(tempName1) || !isValidName(tempName2)) return;
    const n1 = tempName1.trim().toUpperCase();
    const n2 = tempName2.trim().toUpperCase();
    setName1(n1); setName2(n2);
    setStarted(true);
    const newStart = Date.now();
    timerStartRef.current = newStart;
    setTimerStart(newStart);
    breaksRef.current = [0, 0]; bestsRef.current = [0, 0];
    balls1Ref.current = []; balls2Ref.current = [];
    setScores([0, 0]); setBreaks([0, 0]); setBests([0, 0]); setHistory([]);
    await supabase.from("game_state").update({
      player1_name: n1, player2_name: n2,
      score1: 0, score2: 0, break1: 0, break2: 0, best1: 0, best2: 0,
      active: 0, balls1: [], balls2: [], timer_start: newStart,
      updated_at: new Date().toISOString()
    }).eq("id", tableId);
  };

  const joinQueue = async () => {
    if (!queueName.trim()) return;
    const maxPos = queue.length > 0 ? Math.max(...queue.map(q => q.position)) : 0;
    await supabase.from("queue").insert({ name: queueName.trim(), position: maxPos + 1, table_id: tableId });
    setQueueName("");
  };

  const leaveQueue = async (id: number) => {
    await supabase.from("queue").delete().eq("id", id);
  };

  const syncToSupabase = async (
    s: number[], b: number[], bs: number[], a: number, n1: string, n2: string, ts?: number
  ) => {
    await supabase.from("game_state").update({
      score1: s[0], score2: s[1], break1: b[0], break2: b[1],
      best1: bs[0], best2: bs[1], active: a, player1_name: n1, player2_name: n2,
      timer_start: ts !== undefined ? ts : timerStartRef.current,
      balls1: balls1Ref.current, balls2: balls2Ref.current,
      updated_at: new Date().toISOString()
    }).eq("id", tableId);
  };

  const addScore = (pts: number) => {
    const p = active;
    const ball = BALLS.find(b => b.pts === pts);
    if (p === 0) balls1Ref.current = [...balls1Ref.current, { color: ball?.color || "#fff" }];
    else balls2Ref.current = [...balls2Ref.current, { color: ball?.color || "#fff" }];
    const newBreaks = [...breaksRef.current]; newBreaks[p] += pts; breaksRef.current = newBreaks;
    setHistory(h => [...h, { player: p, pts, breakBefore: breaksRef.current[p] - pts, bestBefore: bestsRef.current[p], isEndBreak: false }]);
    const newScores = scores.map((s, i) => i === p ? s + pts : s);
    setScores(newScores); setBreaks([...newBreaks]);
    syncToSupabase(newScores, newBreaks, bestsRef.current, active, name1, name2);
  };

  const addFoul = (pts: number) => {
    const other = active === 0 ? 1 : 0;
    const newBreaks = [...breaksRef.current]; newBreaks[other] += pts; breaksRef.current = newBreaks;
    setHistory(h => [...h, { player: other, pts, breakBefore: breaksRef.current[other] - pts, bestBefore: bestsRef.current[other], isEndBreak: false }]);
    const newScores = scores.map((s, i) => i === other ? s + pts : s);
    setScores(newScores); setBreaks([...newBreaks]);
    syncToSupabase(newScores, newBreaks, bestsRef.current, active, name1, name2);
  };

  const switchPlayer = (to: number) => {
    if (to === active) return;
    const p = active;
    const newBest = Math.max(breaksRef.current[p], bestsRef.current[p]);
    setHistory(h => [...h, { player: p, pts: 0, breakBefore: breaksRef.current[p], bestBefore: bestsRef.current[p], isEndBreak: true }]);
    const newBests = [...bestsRef.current]; newBests[p] = newBest; bestsRef.current = newBests;
    const newBreaks = [...breaksRef.current]; newBreaks[p] = 0; breaksRef.current = newBreaks;
    setBests([...newBests]); setBreaks([...newBreaks]); setActiveState(to);
    syncToSupabase(scores, newBreaks, newBests, to, name1, name2);
  };

  const undo = () => {
    if (!history.length) return;
    const last = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    if (last.isEndBreak) {
      const newBreaks = [...breaksRef.current]; newBreaks[last.player] = last.breakBefore; breaksRef.current = newBreaks;
      const newBests = [...bestsRef.current]; newBests[last.player] = last.bestBefore; bestsRef.current = newBests;
      setBreaks([...newBreaks]); setBests([...newBests]); setActiveState(last.player);
      syncToSupabase(scores, newBreaks, newBests, last.player, name1, name2);
    } else {
      const newScores = scores.map((s, i) => i === last.player ? s - last.pts : s);
      const newBreaks = [...breaksRef.current]; newBreaks[last.player] = last.breakBefore; breaksRef.current = newBreaks;
      if (last.player === 0) balls1Ref.current = balls1Ref.current.slice(0, -1);
      else balls2Ref.current = balls2Ref.current.slice(0, -1);
      setScores(newScores); setBreaks([...newBreaks]);
      syncToSupabase(newScores, newBreaks, bestsRef.current, active, name1, name2);
    }
  };

  const playColorsReset = () => {
    breaksRef.current = [0, 0]; bestsRef.current = [0, 0];
    balls1Ref.current = []; balls2Ref.current = [];
    setScores([0, 0]); setBreaks([0, 0]); setBests([0, 0]); setHistory([]);
    syncToSupabase([0, 0], [0, 0], [0, 0], active, name1, name2);
  };

  const confirmFinDeFrame = async () => {
    const winnerIdx = scores[0] > scores[1] ? 0 : 1;
    const loserIdx = winnerIdx === 0 ? 1 : 0;

    await supabase.from("frames").insert({
      id: Date.now().toString(), table_id: tableId,
      winner: names[winnerIdx], loser: names[loserIdx],
      winner_score: scores[winnerIdx], loser_score: scores[loserIdx],
      date: new Date().toLocaleString("fr-MA"), paid: false,
    });

    const { data: freshQueue } = await supabase.from("queue").select("*").eq("table_id", tableId).order("position");
    const currentQueue = freshQueue || [];
    let nextPlayerName = names[loserIdx];
    if (currentQueue.length > 0) {
      nextPlayerName = currentQueue[0].name;
      await supabase.from("queue").delete().eq("id", currentQueue[0].id);
    }

    const newName1 = winnerIdx === 0 ? names[0] : nextPlayerName;
    const newName2 = winnerIdx === 1 ? names[1] : nextPlayerName;
    const newStart = Date.now();
    breaksRef.current = [0, 0]; bestsRef.current = [0, 0];
    balls1Ref.current = []; balls2Ref.current = [];
    timerStartRef.current = newStart;

    setShowConfirm(false); setScores([0, 0]); setBreaks([0, 0]); setBests([0, 0]);
    setActiveState(0); setHistory([]);
    setName1(newName1); setName2(newName2); setTimerStart(newStart);

    if (currentQueue.length > 0) {
      setStarted(true);
    } else {
      setStarted(false);
      setTempName1(""); setTempName2("");
    }

    await supabase.from("game_state").update({
      score1: 0, score2: 0, break1: 0, break2: 0, best1: 0, best2: 0,
      active: 0, player1_name: newName1, player2_name: newName2,
      timer_start: newStart, balls1: [], balls2: [], updated_at: new Date().toISOString()
    }).eq("id", tableId);
  };

  const diff = Math.abs(scores[0] - scores[1]);
  const playColors = diff < 7;
  const canStart = isValidName(tempName1) && isValidName(tempName2);
  const tableLabel = tableId === 1 ? 9 : 10;

  if (!tableId || loading) return <div style={{ background: "#0d0d0f", minHeight: "100vh" }} />;

  if (!started) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #0a0a0f 0%, #0d1a2e 50%, #0a0f1a 100%)",
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Segoe UI', sans-serif", position: "relative", overflow: "hidden"
      }}>
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "rgba(55,138,221,0.05)", top: -100, right: -100 }} />
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "rgba(29,158,117,0.05)", bottom: -80, left: -80 }} />

        <div style={{
          background: "rgba(255,255,255,0.03)", borderRadius: 24, padding: "44px 40px",
          maxWidth: 420, width: "90%", border: "1px solid rgba(255,255,255,0.08)",
          textAlign: "center", position: "relative", zIndex: 1
        }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontSize: "clamp(28px, 5vw, 42px)",
              fontFamily: "'Times New Roman', serif",
              fontWeight: 900, fontStyle: "italic", letterSpacing: 6,
              background: "linear-gradient(180deg, #ffffff 0%, #d4af37 40%, #ffffff 60%, #b8860b 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 15px rgba(212,175,55,0.3))", marginBottom: 10
            }}>
              JET7POOL
            </div>
            <div style={{
              display: "inline-block", background: "rgba(55,138,221,0.15)",
              border: "1px solid rgba(55,138,221,0.3)", borderRadius: 20,
              padding: "4px 16px", fontSize: 12, color: "#85B7EB", letterSpacing: 3, textTransform: "uppercase"
            }}>
              Table {tableLabel}
            </div>
          </div>

          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 24 }}>
            Enter Players
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 10, color: "rgba(133,183,235,0.6)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>Player 1</div>
              <input
                value={tempName1}
                onChange={e => setTempName1(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canStart && startGame()}
                placeholder="Enter name..."
                autoFocus
                style={{
                  width: "100%", padding: "15px 18px", borderRadius: 14,
                  border: `1.5px solid ${tempName1 && !isValidName(tempName1) ? "rgba(226,75,74,0.5)" : tempName1 && isValidName(tempName1) ? "rgba(29,158,117,0.5)" : "rgba(255,255,255,0.08)"}`,
                  background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 16, fontWeight: 500,
                  outline: "none", boxSizing: "border-box", letterSpacing: 1
                }}
              />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 10, color: "rgba(240,153,123,0.6)", letterSpacing: 3, textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>Player 2</div>
              <input
                value={tempName2}
                onChange={e => setTempName2(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canStart && startGame()}
                placeholder="Enter name..."
                style={{
                  width: "100%", padding: "15px 18px", borderRadius: 14,
                  border: `1.5px solid ${tempName2 && !isValidName(tempName2) ? "rgba(226,75,74,0.5)" : tempName2 && isValidName(tempName2) ? "rgba(29,158,117,0.5)" : "rgba(255,255,255,0.08)"}`,
                  background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 16, fontWeight: 500,
                  outline: "none", boxSizing: "border-box", letterSpacing: 1
                }}
              />
            </div>
          </div>

          <button onClick={startGame} disabled={!canStart} style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: canStart ? "linear-gradient(135deg, #1D9E75 0%, #185FA5 100%)" : "rgba(255,255,255,0.05)",
            color: canStart ? "#fff" : "rgba(255,255,255,0.2)",
            fontSize: 15, fontWeight: 600, cursor: canStart ? "pointer" : "default",
            letterSpacing: 3, textTransform: "uppercase",
            boxShadow: canStart ? "0 4px 20px rgba(29,158,117,0.3)" : "none",
          }}>
            Start Game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: "28px 24px", fontFamily: "sans-serif" }}>

      {showConfirm && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#17171f", borderRadius: 16, padding: 32, maxWidth: 340, width: "90%", border: "1px solid #2a2a36", textAlign: "center" }}>
            <div style={{ fontSize: 16, color: "#fff", marginBottom: 8, letterSpacing: 1, textTransform: "uppercase" }}>Fin de Frame?</div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
              <span style={{ color: "#1D9E75", fontWeight: 500 }}>{names[scores[0] > scores[1] ? 0 : 1]}</span>
              {" "}wins {Math.max(scores[0], scores[1])} — {Math.min(scores[0], scores[1])}
            </div>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 20 }}>
              <span style={{ color: "#E24B4A" }}>{names[scores[0] > scores[1] ? 1 : 0]}</span>
              {" "}ytbeddel b{" "}
              <span style={{ color: "#1D9E75" }}>{queue.length > 0 ? queue[0].name : "New Player"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: 12, borderRadius: 10, border: "1px solid #2a2a36", background: "#0d0d0f", color: "#888", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={confirmFinDeFrame} style={{ padding: 12, borderRadius: 10, border: "1px solid #1a3a1a", background: "#0a1a0a", color: "#1D9E75", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {showQueue && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div style={{ background: "#17171f", borderRadius: 16, padding: 24, maxWidth: 380, width: "90%", border: "1px solid #2a2a36" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#aaa", letterSpacing: 2, textTransform: "uppercase" }}>Waiting — Table {tableLabel}</div>
              <button onClick={() => setShowQueue(false)} style={{ background: "transparent", border: "none", color: "#555", fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={queueName} onChange={e => setQueueName(e.target.value)} onKeyDown={e => e.key === "Enter" && joinQueue()} placeholder="Isem dyalk..."
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #2a2a36", background: "#0d0d0f", color: "#fff", fontSize: 14, outline: "none" }} />
              <button onClick={joinQueue} disabled={!queueName.trim()}
                style={{ padding: "10px 16px", borderRadius: 10, border: "none", background: queueName.trim() ? "#1D9E75" : "#2a2a36", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>Join</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {queue.length === 0 ? (
                <div style={{ textAlign: "center", color: "#333", fontSize: 13, padding: 20 }}>Ma kayn walo...</div>
              ) : queue.map((q, idx) => (
                <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: idx === 0 ? "rgba(29,158,117,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${idx === 0 ? "#1D9E75" : "#2a2a36"}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: idx === 0 ? "#1D9E75" : "#2a2a36", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 500, color: "#fff", flexShrink: 0 }}>{idx + 1}</div>
                  <div style={{ flex: 1, fontSize: 13, color: idx === 0 ? "#1D9E75" : "#888", textTransform: "uppercase", letterSpacing: 1 }}>{q.name}</div>
                  <button onClick={() => leaveQueue(q.id)} style={{ padding: "4px 10px", borderRadius: 8, border: "1px solid #3a1a1a", background: "#1a0808", color: "#E24B4A", fontSize: 12, cursor: "pointer" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 900, margin: "0 auto 24px" }}>
        <h2 style={{ fontSize: 13, letterSpacing: 3, color: "#4a4a5a", textTransform: "uppercase" }}>Table {tableLabel}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => router.push(`/display/${tableId}`)} style={{ background: "transparent", border: "1px solid #2a2a36", borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer", padding: "6px 12px" }}>TV Display</button>
          <button onClick={() => setShowQueue(true)} style={{ background: "transparent", border: "1px solid #2a2a36", borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer", padding: "6px 12px" }}>Queue {queue.length > 0 && `(${queue.length})`}</button>
          <button onClick={() => router.push(`/history`)} style={{ background: "transparent", border: "1px solid #2a2a36", borderRadius: 8, color: "#555", fontSize: 12, cursor: "pointer", padding: "6px 12px" }}>History</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 80px minmax(0,1fr)", gap: 12, alignItems: "center", maxWidth: 900, margin: "0 auto 20px" }}>
        <div onClick={() => switchPlayer(0)} style={{ padding: "20px 12px", borderRadius: 14, textAlign: "center", cursor: "pointer", background: active === 0 ? "#0d1a2e" : "#17171f", border: `2px solid ${active === 0 ? "#378ADD" : "#2a2a36"}` }}>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: active === 0 ? "#85B7EB" : "#aaa", marginBottom: 8 }}>{name1}</div>
          <div style={{ fontSize: 64, fontWeight: 500, lineHeight: 1, color: "#fff", margin: "8px 0" }}>{scores[0]}</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>Break: <b style={{ color: "#888" }}>{breaks[0]}</b></div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Highest break: <b style={{ color: "#666" }}>{bests[0]}</b></div>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>diff</div>
          <div style={{ fontSize: 28, fontWeight: 500, color: "#fff" }}>{diff}</div>
          <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>{diff === 0 ? "equal" : `${names[scores[0] > scores[1] ? 0 : 1]} leads`}</div>
        </div>

        <div onClick={() => switchPlayer(1)} style={{ padding: "20px 12px", borderRadius: 14, textAlign: "center", cursor: "pointer", background: active === 1 ? "#2a1008" : "#17171f", border: `2px solid ${active === 1 ? "#D85A30" : "#2a2a36"}` }}>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", color: active === 1 ? "#F0997B" : "#aaa", marginBottom: 8 }}>{name2}</div>
          <div style={{ fontSize: 64, fontWeight: 500, lineHeight: 1, color: "#fff", margin: "8px 0" }}>{scores[1]}</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>Break: <b style={{ color: "#888" }}>{breaks[1]}</b></div>
          <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Highest break: <b style={{ color: "#666" }}>{bests[1]}</b></div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "#444", letterSpacing: 1, textTransform: "uppercase", margin: "0 auto 18px", maxWidth: 900 }}>
        Active: <b style={{ color: "#aaa" }}>{names[active]}</b>
      </p>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, maxWidth: 900, margin: "0 auto 14px", flexWrap: "wrap" }}>
        {BALLS.map(b => (
          <button key={b.name} onClick={() => addScore(b.pts)} style={{ width: 72, height: 72, borderRadius: "50%", border: "none", background: b.color, color: b.name === "YELLOW" ? "#000" : "#fff", fontSize: 11, fontWeight: 500, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
            <span>{b.name}</span><span style={{ fontSize: 10, opacity: 0.8 }}>+{b.pts}</span>
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto 8px" }}>
        <div style={{ fontSize: 9, color: "#442222", textTransform: "uppercase", letterSpacing: 2, textAlign: "center", marginBottom: 6 }}>Foul — {names[active === 0 ? 1 : 0]} yakhod</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[4, 5, 6, 7].map(pts => (
            <button key={pts} onClick={() => addFoul(pts)} style={{ padding: 14, borderRadius: 10, border: "1px solid #3a1a1a", background: "#1a0808", color: "#E24B4A", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: 1 }}>
              FOUL<br /><span style={{ fontSize: 11, opacity: 0.7 }}>+{pts}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto 8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={undo} style={{ padding: 13, borderRadius: 10, border: "1px solid #2a2a36", background: "#17171f", color: "#888", fontSize: 13, cursor: "pointer" }}>Undo</button>
        <button onClick={() => { if (playColors) playColorsReset(); }} style={{
          padding: 13, borderRadius: 10, fontSize: 13, fontWeight: 500,
          cursor: playColors ? "pointer" : "default",
          border: `1px solid ${playColors ? "#1a3a1a" : "#3a1a1a"}`,
          background: playColors ? "#0a1a0a" : "#1a0808",
          color: playColors ? "#1D9E75" : "#E24B4A",
        }}>
          {playColors ? "✅ Play Colors" : "❌ Frame Over"}
        </button>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <button onClick={() => { if (scores[0] !== scores[1]) setShowConfirm(true); }}
          style={{ width: "100%", padding: 14, borderRadius: 10, border: `1px solid ${scores[0] !== scores[1] ? "#1a3a1a" : "#2a2a36"}`, background: scores[0] !== scores[1] ? "#0a1a0a" : "#17171f", color: scores[0] !== scores[1] ? "#1D9E75" : "#444", fontSize: 14, fontWeight: 500, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase" }}>
          Fin de Frame
        </button>
      </div>
    </div>
  );
}