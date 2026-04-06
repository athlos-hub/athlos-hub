import type { Achievement } from "@/components/achievements/achievement-badge";

/** API pode enviar objeto indexado ou lista heterogênea. */
export function normalizeAchievementsRecord(
  raw: unknown,
): Record<string, Achievement> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  if (Array.isArray(raw)) {
    const out: Record<string, Achievement> = {};
    for (const item of raw) {
      if (item && typeof item === "object" && "achievementType" in item) {
        const a = item as Achievement;
        const k = String(a.achievementType ?? "");
        if (k) out[k] = a;
      }
    }
    return out;
  }
  return raw as Record<string, Achievement>;
}
