import type { FoodPreference, FoodRestriction, TripMember } from "../types";
import type { Restaurant } from "./restaurants";

// Deterministic, not AI — same reasoning as lib/time.ts's Now/Next math: a
// family's safety shouldn't depend on a model call succeeding. A restriction
// (hard fact) can only ever drive a member's score to exactly 0; a
// preference (soft signal) only ever nudges the score up or down from a
// neutral baseline. The two are never allowed to blend into one number.

export interface MemberFoodProfile {
  member: TripMember;
  restrictions: FoodRestriction[];
  preferences: FoodPreference[];
}

export interface MemberMatch {
  tripMemberId: string;
  displayName: string;
  safe: boolean;
  unsafeReason?: string;
  score: number; // 0-100; always exactly 0 when !safe
}

export interface RestaurantMatch {
  restaurant: Restaurant;
  members: MemberMatch[];
  /** "Best Compromise": 0 if unsafe for anyone, else the average of everyone's score. */
  compromiseScore: number;
  anyUnsafe: boolean;
}

function checkSafety(restaurant: Restaurant, restrictions: FoodRestriction[]): { safe: boolean; reason?: string } {
  for (const r of restrictions) {
    const label = r.label.toLowerCase();
    if (label.includes("vegan") && !restaurant.dietary.vegan) {
      return { safe: false, reason: `Not vegan (${r.label})` };
    }
    if (label.includes("vegetarian") && !restaurant.dietary.vegetarian) {
      return { safe: false, reason: `Not vegetarian-friendly (${r.label})` };
    }
    if (label.includes("gluten") && !restaurant.dietary.glutenFree) {
      return { safe: false, reason: `No confirmed gluten-free option (${r.label})` };
    }
    if (r.type === "allergy") {
      const allergens = restaurant.dietary.containsAllergens ?? [];
      const hit = allergens.find((a) => label.includes(a));
      if (hit) return { safe: false, reason: `Menu contains ${hit} (${r.label})` };
    }
  }
  return { safe: true };
}

const NEUTRAL_BASELINE = 55;

function preferenceScore(restaurant: Restaurant, preferences: FoodPreference[]): number {
  let score = NEUTRAL_BASELINE;
  for (const p of preferences) {
    const label = p.label.toLowerCase();
    const matches = restaurant.tags.some((t) => t.includes(label) || label.includes(t)) || restaurant.cuisine.toLowerCase().includes(label);
    if (!matches) continue;
    score += p.category === "like" ? p.weight * 7 : -p.weight * 9;
  }
  return Math.max(5, Math.min(100, Math.round(score)));
}

export function matchRestaurant(restaurant: Restaurant, profiles: MemberFoodProfile[]): RestaurantMatch {
  const members: MemberMatch[] = profiles.map(({ member, restrictions, preferences }) => {
    const { safe, reason } = checkSafety(restaurant, restrictions);
    return {
      tripMemberId: member.id,
      displayName: member.displayName,
      safe,
      unsafeReason: reason,
      score: safe ? preferenceScore(restaurant, preferences) : 0
    };
  });
  const anyUnsafe = members.some((m) => !m.safe);
  const compromiseScore = anyUnsafe ? 0 : Math.round(members.reduce((sum, m) => sum + m.score, 0) / Math.max(1, members.length));
  return { restaurant, members, compromiseScore, anyUnsafe };
}

export type FoodFinderMode = "compromise" | "member";

/** The score to sort and display by for the active mode — the family average, or one member's own. */
export function displayScore(match: RestaurantMatch, mode: FoodFinderMode, focusMemberId?: string): number {
  if (mode === "compromise" || !focusMemberId) return match.compromiseScore;
  return match.members.find((m) => m.tripMemberId === focusMemberId)?.score ?? 0;
}
