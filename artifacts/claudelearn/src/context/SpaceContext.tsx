import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface StudySpace {
  id: number;
  name: string;
  description: string | null;
  materialText: string | null;
  youtubeUrl: string | null;
  lastVisitedPage: string | null;
  conversationId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface SpaceContextValue {
  space: StudySpace | null;
  setSpace: (space: StudySpace | null) => void;
  updateLastPage: (spaceId: number, page: string) => Promise<void>;
  refreshSpace: (spaceId: number) => Promise<void>;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function SpaceProvider({ children }: { children: ReactNode }) {
  const [space, setSpace] = useState<StudySpace | null>(null);

  const updateLastPage = useCallback(async (spaceId: number, page: string) => {
    try {
      const res = await fetch(`/api/study/spaces/${spaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastVisitedPage: page }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSpace(updated);
      }
    } catch {}
  }, []);

  const refreshSpace = useCallback(async (spaceId: number) => {
    try {
      const res = await fetch(`/api/study/spaces/${spaceId}`);
      if (res.ok) {
        const data = await res.json();
        setSpace(data);
      }
    } catch {}
  }, []);

  return (
    <SpaceContext.Provider value={{ space, setSpace, updateLastPage, refreshSpace }}>
      {children}
    </SpaceContext.Provider>
  );
}

export function useSpace() {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used inside SpaceProvider");
  return ctx;
}
