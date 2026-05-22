"use client";

import { useCallback, useEffect, useState } from "react";

const ROWS = 6;
const COLS = 5;

type Status = "correct" | "present" | "absent";
type Guess = { letters: string; statuses: Status[] };

function todayKey(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function playDing(): void {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => ctx.close();
  } catch {
    // audio unsupported or blocked — silent fail
  }
}

const KEYBOARD: string[][] = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACK"],
];

export default function Home() {
  const [date] = useState<string>(todayKey);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const gameOver = won || lost;

  useEffect(() => {
    const raw = localStorage.getItem(`dp:${date}`);
    if (raw) {
      try {
        const s = JSON.parse(raw);
        if (Array.isArray(s.guesses)) setGuesses(s.guesses);
        if (s.won) setWon(true);
        if (s.lost) setLost(true);
        if (typeof s.answer === "string") setAnswer(s.answer);
      } catch {
        // ignore corrupted save
      }
    }
    setHydrated(true);
  }, [date]);

  useEffect(() => {
    if (!hydrated) return;
    if (guesses.length === 0 && !won && !lost) return;
    localStorage.setItem(
      `dp:${date}`,
      JSON.stringify({ guesses, won, lost, answer }),
    );
  }, [hydrated, guesses, won, lost, answer, date]);

  const submit = useCallback(async () => {
    if (busy || gameOver) return;
    if (current.length !== COLS) return;
    setBusy(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          guess: current,
          date,
          guessNumber: guesses.length + 1,
        }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        statuses: Status[];
        win: boolean;
        answer?: string;
      };
      const next = [...guesses, { letters: current, statuses: data.statuses }];
      setGuesses(next);
      setCurrent("");
      if (data.win) {
        setWon(true);
        playDing();
      } else if (next.length >= ROWS) {
        setLost(true);
        if (data.answer) setAnswer(data.answer);
      }
    } catch {
      // network errors silently dropped — user can retry
    } finally {
      setBusy(false);
    }
  }, [busy, gameOver, current, date, guesses]);

  const onKey = useCallback(
    (k: string) => {
      if (gameOver || busy) return;
      if (k === "ENTER") {
        submit();
      } else if (k === "BACK") {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[A-Z]$/.test(k)) {
        setCurrent((c) => (c.length < COLS ? c + k : c));
      }
    },
    [gameOver, busy, submit],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        onKey("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onKey("BACK");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        onKey(e.key.toUpperCase());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey]);

  const letterStatus: Record<string, Status> = {};
  const rank: Record<Status, number> = { absent: 0, present: 1, correct: 2 };
  for (const g of guesses) {
    for (let i = 0; i < COLS; i++) {
      const l = g.letters[i];
      const s = g.statuses[i];
      const prev = letterStatus[l];
      if (!prev || rank[s] > rank[prev]) letterStatus[l] = s;
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-between bg-white text-black px-3 py-6 sm:px-6 sm:py-10 select-none">
      <div className="flex-1 flex flex-col items-center justify-center gap-2 sm:gap-2.5">
        {Array.from({ length: ROWS }).map((_, i) => {
          const g = guesses[i];
          const isCurrent = i === guesses.length && !gameOver;
          return (
            <div key={i} className="flex gap-2 sm:gap-2.5">
              {Array.from({ length: COLS }).map((_, j) => {
                let letter = "";
                let cls = "border-neutral-300 bg-white text-black";
                if (g) {
                  letter = g.letters[j];
                  if (g.statuses[j] === "correct")
                    cls = "border-black bg-black text-white";
                  else if (g.statuses[j] === "present")
                    cls = "border-neutral-500 bg-neutral-500 text-white";
                  else cls = "border-neutral-300 bg-neutral-200 text-neutral-500";
                } else if (isCurrent && j < current.length) {
                  letter = current[j];
                  cls = "border-black bg-white text-black";
                }
                return (
                  <div
                    key={j}
                    className={`w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center text-3xl sm:text-4xl md:text-5xl font-light uppercase border ${cls}`}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="h-8 text-sm sm:text-base uppercase tracking-widest font-light">
        {won && "solved"}
        {lost && answer && answer.toLowerCase()}
      </div>

      <div className="flex flex-col gap-1.5 sm:gap-2 w-full max-w-md sm:max-w-xl md:max-w-2xl mt-2">
        {KEYBOARD.map((row, i) => (
          <div key={i} className="flex gap-1 sm:gap-1.5 justify-center">
            {row.map((k) => {
              const wide = k === "ENTER" || k === "BACK";
              const s = letterStatus[k];
              let cls = "border-neutral-300 bg-white text-black";
              if (s === "correct") cls = "border-black bg-black text-white";
              else if (s === "present")
                cls = "border-neutral-500 bg-neutral-500 text-white";
              else if (s === "absent")
                cls = "border-neutral-300 bg-neutral-200 text-neutral-500";
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => onKey(k)}
                  className={`h-14 sm:h-16 md:h-20 flex items-center justify-center font-normal uppercase rounded border ${
                    wide
                      ? "px-3 sm:px-5 text-xs sm:text-sm md:text-base"
                      : "flex-1 text-base sm:text-xl md:text-2xl"
                  } ${cls}`}
                >
                  {k === "BACK" ? "⌫" : k}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
