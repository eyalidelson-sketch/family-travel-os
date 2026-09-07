import type { ParsedTrip } from "../parsing-types";
import type {
  AIRecommendation,
  Day,
  FoodPreference,
  FoodRestriction,
  ItineraryItem,
  ItineraryItemType,
  MemberProfile,
  Poll,
  PollOption,
  PollVote,
  Trip,
  TripBundle,
  TripMember
} from "../types";

export interface PollWithResults {
  poll: Poll;
  options: PollOption[];
  votes: PollVote[];
}

export interface ItemInput {
  type: ItineraryItemType;
  title: string;
  startTime?: string;
  endTime?: string;
  placeName?: string;
  notes?: string;
}

export interface ItemPatch {
  title?: string;
  type?: ItineraryItemType;
  startTime?: string | null;
  endTime?: string | null;
  placeName?: string | null;
  notes?: string;
}

export interface TripRepository {
  createTripFromParsed(parsed: ParsedTrip, organizerName: string): Promise<TripBundle>;
  getTripBundle(tripId: string): Promise<TripBundle | null>;
  getTripByInviteCode(code: string): Promise<Trip | null>;
  joinTrip(tripId: string, displayName: string): Promise<TripMember>;

  getTripMember(memberId: string): Promise<TripMember | null>;
  listTripMembers(tripId: string): Promise<TripMember[]>;

  getMemberProfile(tripMemberId: string): Promise<MemberProfile>;
  addFoodRestriction(tripMemberId: string, input: Omit<FoodRestriction, "id" | "tripMemberId">): Promise<FoodRestriction>;
  removeFoodRestriction(id: string): Promise<void>;
  addFoodPreference(tripMemberId: string, input: Omit<FoodPreference, "id" | "tripMemberId">): Promise<FoodPreference>;
  removeFoodPreference(id: string): Promise<void>;

  addItineraryItem(dayId: string, actorTripMemberId: string, input: ItemInput): Promise<ItineraryItem>;
  updateItineraryItem(itemId: string, actorTripMemberId: string, patch: ItemPatch): Promise<ItineraryItem>;
  deleteItineraryItem(itemId: string, actorTripMemberId: string): Promise<void>;
  moveItineraryItem(itemId: string, actorTripMemberId: string, direction: "up" | "down"): Promise<void>;

  /** Inserts a fresh day right after `afterDayId`, shifting every later day's date (in its own timezone) and dayIndex forward by one. */
  addDayAfter(tripId: string, afterDayId: string, actorTripMemberId: string): Promise<Day>;
  /** Removes a day (and its items/transport), shifting every later day's date and dayIndex back by one. Refuses to delete a trip's last remaining day. */
  deleteDay(dayId: string, actorTripMemberId: string): Promise<void>;

  /** IDs of recommendations (of a given type) a member has already dismissed/acted on — issues are recomputed fresh each load, only this "seen" state is persisted. */
  listDismissedRecommendationIds(tripId: string, type: AIRecommendation["type"]): Promise<string[]>;
  dismissRecommendation(tripId: string, id: string, type: AIRecommendation["type"], actorTripMemberId: string): Promise<void>;

  createPoll(tripId: string, actorTripMemberId: string, question: string, optionLabels: string[]): Promise<PollWithResults>;
  listPolls(tripId: string): Promise<PollWithResults[]>;
  getPoll(pollId: string): Promise<PollWithResults | null>;
  /** Casts or changes a member's vote — a member has at most one active vote per poll. */
  castVote(pollId: string, tripMemberId: string, optionId: string): Promise<void>;
  closePoll(pollId: string, actorTripMemberId: string): Promise<void>;
}
