"use client";

import { create } from "zustand";

type WsStatus = "disconnected" | "connecting" | "connected";

export type RoomPhase = "lobby" | "round" | "review" | "final";

export type RoundCriterion =
  | { key: "price" | "km" | "hp"; kind: "max" | "min"; label: string; unit: string; target: number }
  | { key: "year"; kind: "range"; label: string; unit: string; target: { min: number; max: number } };

export type RoundState = {
  index: number;
  tolerance: number;
  criteria: RoundCriterion[];
  startedAt: number;
  endsAt: number;
  endedAt: number | null;
};

export type RoundResult = {
  url: string;
  extracted: { price: number; km: number; hp: number; year: number } | null;
  valid: boolean;
  totalScore: number;
  breakdown: Array<{
    key: string;
    label: string;
    kind?: string;
    unit?: string;
    target?: unknown;
    within: boolean;
    score: number;
    value: number | null;
    allowed: { min: number; max: number } | null;
  }>;
};

export type PlayerState = {
  id: string;
  name: string;
  connected: boolean;
  url: string;
  finished: boolean;
  totalScore: number;
  roundScore?: number;
  roundResult?: RoundResult | null;
};

export type RoomState = {
  id: string;
  hostId: string;
  phase: RoomPhase;
  settings: { timerSec: number; totalRounds: number };
  players: PlayerState[];
  round: RoundState | null;
  review: { index: number; order: string[] } | null;
};

type MpState = {
  clientId: string;
  name: string;
  wsStatus: WsStatus;
  wsError: string | null;
  room: RoomState | null;
};

type MpActions = {
  setName: (name: string) => void;
  connect: () => void;
  disconnect: () => void;

  createRoom: () => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  claimHost: () => void;

  setTimerSec: (timerSec: number) => void;
  startRound: () => void;
  submitUrl: (url: string) => void;
  finish: () => void;
  reviewNext: () => void;

  clearError: () => void;
};

function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "server";
  const key = "mp_client_id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const id = (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`)
    .replace(/[^a-zA-Z0-9_\\-]/g, "")
    .slice(0, 64);
  window.localStorage.setItem(key, id);
  return id;
}

function wsUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:3000/ws";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

function clampName(input: string): string {
  return input.trim().replace(/\\s+/g, " ").slice(0, 18);
}

export const useMpStore = create<MpState & MpActions>((set, get) => {
  let socket: WebSocket | null = null;

  function send(payload: unknown) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(payload));
  }

  function connect() {
    const state = get();
    if (state.wsStatus === "connecting" || state.wsStatus === "connected") return;
    const name = clampName(state.name);
    if (!name) {
      set({ wsError: "Choisis un pseudo avant de te connecter." });
      return;
    }

    set({ wsStatus: "connecting", wsError: null });
    socket = new WebSocket(wsUrl());

    socket.addEventListener("open", () => {
      set({ wsStatus: "connected" });
      send({ type: "hello", clientId: state.clientId, name });
    });

    socket.addEventListener("message", (ev) => {
      let msg: unknown;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;
      const m = msg as Record<string, unknown>;
      const type = typeof m.type === "string" ? m.type : null;
      if (type === "room_state") {
        set({ room: m.room as RoomState });
        return;
      }
      if (type === "error") {
        const message = typeof m.message === "string" ? m.message : "Erreur réseau.";
        set({ wsError: message });
        return;
      }
      if (type === "info") {
        const message = typeof m.message === "string" ? m.message : "";
        if (message) set({ wsError: message });
      }
    });

    socket.addEventListener("close", () => {
      set({ wsStatus: "disconnected" });
    });
    socket.addEventListener("error", () => {
      set({ wsStatus: "disconnected", wsError: "Connexion WebSocket impossible." });
    });
  }

  return {
    clientId: getOrCreateClientId(),
    name: typeof window !== "undefined" ? window.localStorage.getItem("mp_name") || "" : "",
    wsStatus: "disconnected",
    wsError: null,
    room: null,

    setName: (name) => {
      const clean = clampName(name);
      set({ name: clean });
      if (typeof window !== "undefined") window.localStorage.setItem("mp_name", clean);
    },

    connect,

    disconnect: () => {
      if (socket) socket.close();
      socket = null;
      set({ wsStatus: "disconnected", room: null });
    },

    createRoom: () => send({ type: "create_room" }),
    joinRoom: (roomId) => send({ type: "join_room", roomId: String(roomId || "").trim().toUpperCase() }),
    leaveRoom: () => {
      const room = get().room;
      if (!room) return;
      send({ type: "leave_room" });
      set({ room: null });
    },
    claimHost: () => send({ type: "claim_host" }),

    setTimerSec: (timerSec) => send({ type: "set_timer", timerSec }),
    startRound: () => send({ type: "start_round" }),
    submitUrl: (url) => send({ type: "submit_url", url }),
    finish: () => send({ type: "finish" }),
    reviewNext: () => send({ type: "review_next" }),

    clearError: () => set({ wsError: null })
  };
});

export function isHost(room: RoomState | null, clientId: string): boolean {
  return !!room && room.hostId === clientId;
}
