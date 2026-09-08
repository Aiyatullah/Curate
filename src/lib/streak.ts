import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appState } from "@/lib/db/schema";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = Date.parse(b) - Date.parse(a);
  return Math.round(ms / 86_400_000);
}

/** Call after any solved attempt. Bumps or resets the streak based on last active date. */
export async function touchStreak(): Promise<number> {
  const [state] = await db.select().from(appState).where(eq(appState.id, 1));
  const today = todayStr();

  if (!state) {
    await db.insert(appState).values({ id: 1, streakDays: 1, lastActiveDate: today });
    return 1;
  }

  if (state.lastActiveDate === today) return state.streakDays;

  const gap = state.lastActiveDate ? daysBetween(state.lastActiveDate, today) : 999;
  const streakDays = gap === 1 ? state.streakDays + 1 : 1;

  await db
    .update(appState)
    .set({ streakDays, lastActiveDate: today })
    .where(eq(appState.id, 1));
  return streakDays;
}

export async function getAppState() {
  const [state] = await db.select().from(appState).where(eq(appState.id, 1));
  return (
    state ?? {
      id: 1,
      currentPhase: "Foundation",
      currentTopic: "Arrays",
      streakDays: 0,
      lastActiveDate: null,
    }
  );
}
