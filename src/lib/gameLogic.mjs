/**
 * Shared gameplay logic (runs on server and client).
 * Tailwind theme and UI live elsewhere; this file is pure JS (ES6+).
 */

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function createRoomId(length = 6) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < length; i++) out += ROOM_ALPHABET[bytes[i] % ROOM_ALPHABET.length];
  return out;
}

export function formatSeconds(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function hashStringToUint32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickInt(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function shuffleInPlace(rand, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createRound({ index, timerSec, seed }) {
  const rand = mulberry32(hashStringToUint32(String(seed)));
  const criteriaPool = [
    () => ({
      key: "price",
      kind: "max",
      label: "Prix max",
      unit: "€",
      target: pickInt(rand, 2500, 15000)
    }),
    () => ({
      key: "km",
      kind: "max",
      label: "Kilométrage max",
      unit: "km",
      target: pickInt(rand, 80000, 320000)
    }),
    () => ({
      key: "hp",
      kind: "min",
      label: "Puissance min",
      unit: "ch",
      target: pickInt(rand, 90, 320)
    }),
    () => {
      const a = pickInt(rand, 1988, 2012);
      const b = pickInt(rand, a + 4, Math.min(2024, a + pickInt(rand, 8, 18)));
      return {
        key: "year",
        kind: "range",
        label: "Année",
        unit: "",
        target: { min: a, max: b }
      };
    }
  ];

  const count = pickInt(rand, 2, 4);
  const factories = shuffleInPlace(rand, criteriaPool).slice(0, count);
  const criteria = factories.map((f) => f());

  const startedAt = Date.now();
  const endsAt = startedAt + timerSec * 1000;

  return {
    index,
    tolerance: 0.1,
    criteria,
    startedAt,
    endsAt,
    endedAt: null
  };
}

export function simulateExtraction(url) {
  const seed = hashStringToUint32(String(url || ""));
  const rand = mulberry32(seed);
  return {
    price: pickInt(rand, 900, 25000),
    km: pickInt(rand, 15000, 360000),
    hp: pickInt(rand, 60, 520),
    year: pickInt(rand, 1980, 2024)
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function scoreMax({ value, target, tol }) {
  const allowedMax = target * (1 + tol);
  const within = value <= allowedMax;
  if (!within) return { within: false, score: 0, allowed: { min: 0, max: Math.round(allowedMax) } };
  // Being under the max is "good"; score 100 if <= target, then degrade to 0 at allowedMax.
  if (value <= target) return { within: true, score: 100, allowed: { min: 0, max: Math.round(allowedMax) } };
  const denom = Math.max(1, allowedMax - target);
  const t = 1 - (value - target) / denom;
  return { within: true, score: Math.round(100 * clamp01(t)), allowed: { min: 0, max: Math.round(allowedMax) } };
}

function scoreMin({ value, target, tol }) {
  const allowedMin = target * (1 - tol);
  const within = value >= allowedMin;
  const allowed = { min: Math.round(allowedMin), max: Number.MAX_SAFE_INTEGER };
  if (!within) return { within: false, score: 0, allowed };
  // Being above the min is "good"; score 100 if >= target, then degrade to 0 at allowedMin.
  if (value >= target) return { within: true, score: 100, allowed };
  const denom = Math.max(1, target - allowedMin);
  const t = 1 - (target - value) / denom;
  return { within: true, score: Math.round(100 * clamp01(t)), allowed };
}

function scoreRange({ value, target, tol }) {
  const span = Math.max(1, target.max - target.min);
  const allowedMin = target.min - span * tol;
  const allowedMax = target.max + span * tol;
  const within = value >= allowedMin && value <= allowedMax;
  const allowed = { min: Math.round(allowedMin), max: Math.round(allowedMax) };
  if (!within) return { within: false, score: 0, allowed };
  // Score 100 inside the target range, then degrade to 0 toward the tolerance edges.
  if (value >= target.min && value <= target.max) return { within: true, score: 100, allowed };
  if (value < target.min) {
    const denom = Math.max(1, target.min - allowedMin);
    const t = 1 - (target.min - value) / denom;
    return { within: true, score: Math.round(100 * clamp01(t)), allowed };
  }
  const denom = Math.max(1, allowedMax - target.max);
  const t = 1 - (value - target.max) / denom;
  return { within: true, score: Math.round(100 * clamp01(t)), allowed };
}

export function scoreSubmission(round, extracted) {
  const tol = round.tolerance ?? 0.1;
  const breakdown = round.criteria.map((c) => {
    const value = extracted?.[c.key];
    if (!Number.isFinite(value)) return { key: c.key, label: c.label, within: false, score: 0, value: null, allowed: null };

    if (c.kind === "max") {
      const s = scoreMax({ value, target: c.target, tol });
      return { key: c.key, label: c.label, within: s.within, score: s.score, value, allowed: s.allowed, target: c.target, kind: c.kind, unit: c.unit };
    }
    if (c.kind === "min") {
      const s = scoreMin({ value, target: c.target, tol });
      return { key: c.key, label: c.label, within: s.within, score: s.score, value, allowed: s.allowed, target: c.target, kind: c.kind, unit: c.unit };
    }
    const s = scoreRange({ value, target: c.target, tol });
    return { key: c.key, label: c.label, within: s.within, score: s.score, value, allowed: s.allowed, target: c.target, kind: c.kind, unit: c.unit };
  });

  const valid = breakdown.every((b) => b.within);
  const avg = breakdown.reduce((acc, b) => acc + b.score, 0) / Math.max(1, breakdown.length);
  // Keep the tolerance rule meaningful, but still give "consolation points" so the leaderboard moves.
  const totalScore = Math.round(avg * (valid ? 1 : 0.35));

  return { valid, totalScore, breakdown };
}

export function endRoundScoring(room) {
  const round = room.round;
  if (!round) return;
  for (const player of room.players) {
    const url = (player.url || "").trim();
    if (!url) {
      player.roundScore = 0;
      player.roundResult = { url, extracted: null, valid: false, totalScore: 0, breakdown: [], source: "none" };
      continue;
    }
    // Default: deterministic simulated extraction from URL.
    // If the player provided manual data, we overlay it on top for "real" scoring.
    const base = simulateExtraction(url);
    const manual = player.manual && typeof player.manual === "object" ? player.manual : null;
    const hasManual =
      !!manual &&
      (Number.isFinite(manual?.price) || Number.isFinite(manual?.km) || Number.isFinite(manual?.hp) || Number.isFinite(manual?.year));
    const extracted = {
      ...base,
      ...(Number.isFinite(manual?.price) ? { price: Math.round(manual.price) } : null),
      ...(Number.isFinite(manual?.km) ? { km: Math.round(manual.km) } : null),
      ...(Number.isFinite(manual?.hp) ? { hp: Math.round(manual.hp) } : null),
      ...(Number.isFinite(manual?.year) ? { year: Math.round(manual.year) } : null)
    };
    const scored = scoreSubmission(round, extracted);
    player.roundScore = scored.totalScore;
    player.roundResult = { url, extracted, ...scored, source: hasManual ? "manual" : "simulated" };
    player.totalScore = (player.totalScore || 0) + player.roundScore;
  }
}
