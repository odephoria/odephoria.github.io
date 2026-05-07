import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const DAILY_BUDGET = 120_000;
const KEY = "odephoria_tokens";

interface Session { date: string; used: number; }

function getToday() { return new Date().toISOString().slice(0, 10); }

function readSession(): Session {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s: Session = JSON.parse(raw);
      if (s.date === getToday()) return s;
    }
  } catch {}
  return { date: getToday(), used: 0 };
}

function saveSession(s: Session) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

interface TokenContextValue {
  used: number;
  remaining: number;
  pct: number;
  isLow: boolean;
  isVeryLow: boolean;
  isDepleted: boolean;
  addTokens: (n: number) => void;
  resetDate: string;
}

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(readSession);

  const addTokens = useCallback((n: number) => {
    setSession((prev) => {
      const next = { ...prev, used: prev.used + Math.max(0, Math.round(n)) };
      saveSession(next);
      return next;
    });
  }, []);

  const remaining = Math.max(0, DAILY_BUDGET - session.used);
  const pct = session.used / DAILY_BUDGET;
  const isLow = remaining < 25_000 && remaining > 0;
  const isVeryLow = remaining < 8_000 && remaining > 0;
  const isDepleted = remaining <= 0;

  // Compute when tomorrow starts (UTC midnight)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetDate = tomorrow.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " tomorrow";

  return (
    <TokenContext.Provider value={{ used: session.used, remaining, pct, isLow, isVeryLow, isDepleted, addTokens, resetDate }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useTokens() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error("useTokens must be inside TokenProvider");
  return ctx;
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
