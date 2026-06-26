"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Role } from "./types";

type Session = {
  role: Role | null;
  userName: string | null;
  plantId: number | null;
  plantName: string | null;
};

type SessionCtx = Session & {
  setSession: (s: Session) => void;
  clear: () => void;
  ready: boolean;
};

const SessionContext = createContext<SessionCtx | null>(null);

const STORAGE_KEY = "veolia_fms_session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Session>({
    role: null,
    userName: null,
    plantId: null,
    plantName: null,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const setSession = (s: Session) => {
    setState(s);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {}
  };
  const clear = () => {
    setState({ role: null, userName: null, plantId: null, plantName: null });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <SessionContext.Provider value={{ ...state, setSession, clear, ready }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}

export function canEdit(role: Role | null): boolean {
  return role === "PLANT_USER" || role === "FINANCE_TEAM";
}

export function canApprove(role: Role | null): boolean {
  return role === "PLANT_HEAD" || role === "FINANCE_TEAM" || role === "SENIOR_MGMT_2";
}

export function canSeeAllPlants(role: Role | null): boolean {
  return (
    role === "FINANCE_TEAM" ||
    role === "SENIOR_MGMT_1" ||
    role === "SENIOR_MGMT_2"
  );
}
