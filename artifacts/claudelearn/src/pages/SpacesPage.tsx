import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSound } from "@/hooks/use-sound";
import { useTheme } from "@/context/ThemeContext";
import { SoundButton } from "@/components/SoundButton";
import { Plus, BookOpen, Youtube, FileText, Clock, Trash2, X, Loader2, ArrowRight, Edit2, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudySpace {
  id: number;
  name: string;
  description: string | null;
  materialText: string | null;
  youtubeUrl: string | null;
  lastVisitedPage: string | null;
  createdAt: string;
  updatedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&\n?#]+)/);
  return m ? m[1] : null;
}

interface SpaceFormData {
  name: string;
  description: string;
  materialText: string;
  youtubeUrl: string;
}

const EMPTY_FORM: SpaceFormData = { name: "", description: "", materialText: "", youtubeUrl: "" };

export default function SpacesPage() {
  const { play } = useSound();
  const { theme, toggle: toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [spaces, setSpaces] = useState<StudySpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editSpace, setEditSpace] = useState<StudySpace | null>(null);
  const [form, setForm] = useState<SpaceFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function loadSpaces() {
    try {
      const res = await fetch("/api/study/spaces");
      if (res.ok) setSpaces(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSpaces(); }, []);

  async function createSpace() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/study/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const space = await res.json();
        play("success");
        setShowCreate(false);
        setForm(EMPTY_FORM);
        navigate(`/space/${space.id}/chat`);
      }
    } catch { play("error"); }
    finally { setSaving(false); }
  }

  async function saveEdit() {
    if (!editSpace || !form.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/study/spaces/${editSpace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        play("success");
        setEditSpace(null);
        setForm(EMPTY_FORM);
        await loadSpaces();
      }
    } catch { play("error"); }
    finally { setSaving(false); }
  }

  async function deleteSpace(id: number) {
    play("error");
    await fetch(`/api/study/spaces/${id}`, { method: "DELETE" });
    setDeleteId(null);
    setSpaces((prev) => prev.filter((s) => s.id !== id));
  }

  function openCreate() { play("click"); setForm(EMPTY_FORM); setShowCreate(true); }
  function openEdit(space: StudySpace, e: React.MouseEvent) {
    e.stopPropagation();
    play("click");
    setEditSpace(space);
    setForm({ name: space.name, description: space.description ?? "", materialText: space.materialText ?? "", youtubeUrl: space.youtubeUrl ?? "" });
  }
  function closeModal() { setShowCreate(false); setEditSpace(null); setForm(EMPTY_FORM); }

  function enterSpace(space: StudySpace) {
    play("click");
    const page = space.lastVisitedPage || "chat";
    navigate(`/space/${space.id}/${page}`);
  }

  const isModalOpen = showCreate || !!editSpace;

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Odephoria</h1>
          <p className="text-muted-foreground mt-1">Your study spaces. Pick one to begin.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { play("click"); toggleTheme(); }}
            onMouseEnter={() => play("hover")}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-all"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
          <SoundButton onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            New Space
          </SoundButton>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center pt-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : spaces.length === 0 ? (
        <div
          onClick={openCreate}
          onMouseEnter={() => play("hover")}
          className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border rounded-2xl p-16 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-foreground mb-1">Create your first study space</p>
            <p className="text-sm text-muted-foreground">Paste your study material and let Odephoria help you master it.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* New space card */}
          <div
            onClick={openCreate}
            onMouseEnter={() => play("hover")}
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-2xl p-8 cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-all min-h-[200px]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">New Space</span>
          </div>

          {spaces.map((space) => {
            const ytId = space.youtubeUrl ? getYouTubeId(space.youtubeUrl) : null;
            const hasText = !!space.materialText;
            return (
              <div
                key={space.id}
                onClick={() => enterSpace(space)}
                onMouseEnter={() => play("hover")}
                className="group relative paper-card cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col min-h-[200px]"
              >
                {/* YouTube thumbnail */}
                {ytId && (
                  <div className="h-28 bg-muted overflow-hidden shrink-0">
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/80" style={{ top: 0, bottom: "auto", height: "7rem" }} />
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-base leading-tight flex-1 pr-2">{space.name}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => openEdit(space, e)}
                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); play("error"); setDeleteId(space.id); }}
                        className="p-1 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {space.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{space.description}</p>
                  )}

                  <div className="flex items-center gap-2 mt-auto">
                    {hasText && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" /> Material
                      </span>
                    )}
                    {ytId && (
                      <span className="flex items-center gap-1 text-xs text-red-600">
                        <Youtube className="w-3 h-3" /> Video
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                      <Clock className="w-3 h-3" />
                      {timeAgo(space.updatedAt)}
                    </span>
                  </div>

                  {space.lastVisitedPage && (
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground capitalize">Last: {space.lastVisitedPage.replace("-", " ")}</span>
                      <span className="text-xs text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDeleteId(null)}>
          <div className="paper-card p-6 max-w-sm w-full mx-4 paper-shadow" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Delete this space?</h3>
            <p className="text-sm text-muted-foreground mb-5">This will permanently delete the space and all its chat history.</p>
            <div className="flex gap-3">
              <SoundButton variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</SoundButton>
              <SoundButton className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={() => deleteSpace(deleteId)}>Delete</SoundButton>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-foreground/10 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="paper-card w-full max-w-xl paper-shadow overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">{editSpace ? "Edit Space" : "New Study Space"}</h2>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Space name <span className="text-destructive">*</span></label>
                <input
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                  placeholder="e.g. Biology Chapter 5 — Cell Division"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                  placeholder="e.g. Midterm prep, chapters 3–7"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Study material <span className="text-muted-foreground font-normal">(paste notes, textbook text, etc.)</span></label>
                <textarea
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors resize-none"
                  placeholder="Paste your study material here. The more you add, the better Odephoria can help..."
                  rows={8}
                  value={form.materialText}
                  onChange={(e) => setForm((f) => ({ ...f, materialText: e.target.value }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" />
                  YouTube video URL <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                  placeholder="https://youtube.com/watch?v=..."
                  value={form.youtubeUrl}
                  onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-border bg-muted/30">
              <SoundButton variant="outline" className="flex-1" onClick={closeModal}>Cancel</SoundButton>
              <SoundButton className="flex-1" disabled={!form.name.trim() || saving} onClick={editSpace ? saveEdit : createSpace}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editSpace ? "Save Changes" : "Create Space"}
              </SoundButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
