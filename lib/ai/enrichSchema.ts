import { z } from "zod";

// Validates a single, bilingual Claude place-enrichment call — every English
// field has an optional "...He" Hebrew twin, filled in the SAME call rather
// than a separate locale-specific request. See lib/ai/enrichPlace.ts for why:
// this is what lets a place fetched once serve both an English and a Hebrew
// viewer correctly, instead of whichever locale happened to fetch it first
// "winning" the 30-day cache entry.

export const enrichmentSchema = z.object({
  description: z.string().min(1).max(400),
  descriptionHe: z.string().min(1).max(400).optional(),
  nameHe: z.string().max(200).optional(),
  whatToDo: z.string().max(600).optional(),
  whatToDoHe: z.string().max(600).optional(),
  nearestStation: z.string().optional(),
  nearestStationHe: z.string().optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  amenities: z.array(z.string()).optional(),
  amenitiesHe: z.array(z.string()).optional(),
  estimatedVisitMinutes: z.number().int().positive().optional(),
  familyTips: z.string().optional(),
  familyTipsHe: z.string().optional(),
  openingHours: z.string().max(200).optional(),
  openingHoursHe: z.string().max(200).optional(),
  estimatedCost: z.string().max(200).optional(),
  estimatedCostHe: z.string().max(200).optional(),
  familyAccessibility: z.string().max(400).optional(),
  familyAccessibilityHe: z.string().max(400).optional()
});

export type EnrichmentFromAI = z.infer<typeof enrichmentSchema>;
