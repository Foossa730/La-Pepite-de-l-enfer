declare module "@/lib/gameLogic.mjs" {
  export function createRoomId(length?: number): string;
  export function formatSeconds(totalSeconds: number): string;

  export function createRound(args: {
    index: number;
    timerSec: number;
    seed: string;
  }): {
    index: number;
    tolerance: number;
    criteria: unknown[];
    startedAt: number;
    endsAt: number;
    endedAt: number | null;
  };

  export function simulateExtraction(url: string): { price: number; km: number; hp: number; year: number };

  export function scoreSubmission(
    round: unknown,
    extracted: { price: number; km: number; hp: number; year: number } | null
  ): { valid: boolean; totalScore: number; breakdown: unknown[] };
}
