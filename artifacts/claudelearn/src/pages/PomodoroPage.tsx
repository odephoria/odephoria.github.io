import { useState, useEffect, useRef, useCallback } from "react";
import { useSound } from "@/hooks/use-sound";
import { SoundButton } from "@/components/SoundButton";
import { cn } from "@/lib/utils";
import { Play, Pause, RotateCcw, Coffee, BookOpen, Settings } from "lucide-react";

type Mode = "focus" | "shortBreak" | "longBreak";

const DEFAULTS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const MODE_CONFIG = {
  focus: { label: "Focus", color: "hsl(271 81% 66%)", icon: BookOpen },
  shortBreak: { label: "Short Break", color: "hsl(160 65% 50%)", icon: Coffee },
  longBreak: { label: "Long Break", color: "hsl(200 80% 58%)", icon: Coffee },
};

export default function PomodoroPage() {
  const { play } = useSound();
  const [mode, setMode] = useState<Mode>("focus");
  const [durations, setDurations] = useState(DEFAULTS);
  const [seconds, setSeconds] = useState(DEFAULTS.focus * 60);
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = durations[mode] * 60;
  const progress = ((total - seconds) / total) * 100;

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const tick = useCallback(() => {
    setSeconds((s) => {
      if (s <= 1) {
        stop();
        play("timerEnd");
        if (mode === "focus") setSessions((n) => n + 1);
        return 0;
      }
      return s - 1;
    });
  }, [stop, play, mode]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  function switchMode(m: Mode) {
    stop();
    setMode(m);
    setSeconds(durations[m] * 60);
    play("click");
  }

  function toggle() {
    if (seconds === 0) return;
    play(running ? "click" : "success");
    setRunning((r) => !r);
  }

  function reset() {
    stop();
    setSeconds(durations[mode] * 60);
    play("click");
  }

  const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
  const ss = (seconds % 60).toString().padStart(2, "0");

  const cfg = MODE_CONFIG[mode];
  const circumference = 2 * Math.PI * 120;
  const dash = circumference - (progress / 100) * circumference;

  return (
    <div className="max-w-lg mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Pomodoro Timer</h1>
          <p className="text-muted-foreground text-sm">Stay focused with timed study sessions</p>
        </div>
        <SoundButton
          variant="ghost"
          size="icon"
          onClick={() => { play("click"); setShowSettings((s) => !s); }}
        >
          <Settings className="w-5 h-5" />
        </SoundButton>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 rounded-xl bg-card border border-border space-y-3">
          <h3 className="text-sm font-semibold">Durations (minutes)</h3>
          {(["focus", "shortBreak", "longBreak"] as Mode[]).map((m) => (
            <div key={m} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{MODE_CONFIG[m].label}</span>
              <div className="flex items-center gap-2">
                <button
                  onMouseEnter={() => play("hover")}
                  onClick={() => { play("click"); setDurations((d) => ({ ...d, [m]: Math.max(1, d[m] - 1) })); }}
                  className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
                >-</button>
                <span className="w-8 text-center text-sm font-mono">{durations[m]}</span>
                <button
                  onMouseEnter={() => play("hover")}
                  onClick={() => { play("click"); setDurations((d) => ({ ...d, [m]: Math.min(60, d[m] + 1) })); }}
                  className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center text-sm hover:bg-secondary transition-colors"
                >+</button>
              </div>
            </div>
          ))}
          <SoundButton size="sm" variant="outline" className="w-full mt-2" onClick={() => {
            reset();
            setShowSettings(false);
          }}>
            Apply
          </SoundButton>
        </div>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8">
        {(["focus", "shortBreak", "longBreak"] as Mode[]).map((m) => (
          <button
            key={m}
            onMouseEnter={() => play("hover")}
            onClick={() => switchMode(m)}
            className={cn(
              "flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-all",
              mode === m
                ? "bg-card border border-border text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {MODE_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Timer circle */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 264 264">
            <circle cx="132" cy="132" r="120" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
            <circle
              cx="132" cy="132" r="120"
              fill="none"
              stroke={cfg.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dash}
              style={{ transition: "stroke-dashoffset 1s linear", filter: `drop-shadow(0 0 8px ${cfg.color}60)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-5xl font-mono font-bold tabular-nums" style={{ color: cfg.color }}>
              {mm}:{ss}
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <cfg.icon className="w-3.5 h-3.5" />
              {cfg.label}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 justify-center mb-8">
        <SoundButton variant="outline" size="icon" onClick={reset} className="w-12 h-12">
          <RotateCcw className="w-5 h-5" />
        </SoundButton>
        <SoundButton
          onClick={toggle}
          className="w-20 h-20 rounded-full text-lg glow-primary"
          style={{ background: cfg.color, borderColor: cfg.color }}
          soundOnClick={false}
        >
          {running ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 translate-x-0.5" />}
        </SoundButton>
        <div className="w-12 h-12 flex items-center justify-center">
          <span className="text-xs text-muted-foreground text-center">{sessions}<br/>done</span>
        </div>
      </div>

      {/* Session indicators */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: Math.max(4, sessions + 1) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              i < sessions ? "bg-primary scale-110" : "bg-muted-foreground/30"
            )}
          />
        ))}
      </div>

      {sessions > 0 && (
        <p className="text-center text-sm text-muted-foreground mt-4">
          {sessions} session{sessions !== 1 ? "s" : ""} completed today
          {sessions >= 4 ? " — take a long break!" : ""}
        </p>
      )}
    </div>
  );
}
