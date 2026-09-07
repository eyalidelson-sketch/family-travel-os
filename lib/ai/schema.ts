import { z } from "zod";

// Validates whatever the Claude tool-use call returns before it's trusted
// anywhere in the app. If this fails, parseItinerary() falls back to the
// deterministic heuristic parser rather than surfacing a malformed itinerary.

const itemSchema = z.object({
  type: z.enum(["activity", "meal", "transport", "note", "free_time"]),
  title: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  placeName: z.string().optional(),
  cityHint: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  reviewReason: z.string().optional()
});

const hotelSchema = z.object({
  placeName: z.string().min(1),
  cityHint: z.string().optional(),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  referenceNumber: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

const transportSchema = z.object({
  mode: z.enum(["flight", "train", "car", "bus", "ferry", "other"]),
  fromPlaceName: z.string().optional(),
  toPlaceName: z.string().optional(),
  departTime: z.string().optional(),
  arriveTime: z.string().optional(),
  carrier: z.string().optional(),
  referenceNumber: z.string().optional(),
  confidence: z.number().min(0).max(1)
});

const daySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cityHint: z.string().optional(),
  isTravelDay: z.boolean(),
  items: z.array(itemSchema),
  hotel: hotelSchema.optional(),
  transport: z.array(transportSchema).optional()
});

export const parsedTripSchema = z.object({
  name: z.string().min(1),
  countries: z.array(z.string()),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.array(daySchema).min(1),
  warnings: z.array(z.string())
});

export type ParsedTripFromAI = z.infer<typeof parsedTripSchema>;
