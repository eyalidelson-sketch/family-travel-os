"use server";

import { revalidatePath } from "next/cache";
import { repo } from "../repo";
import { getCurrentMember, isOrganizerForTrip } from "../session";
import type { PollWithResults } from "../repo/types";

export async function createPollAction(tripId: string, question: string, options: string[]): Promise<{ error?: string; poll?: PollWithResults }> {
  const trimmedQuestion = question.trim();
  const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
  if (!trimmedQuestion) return { error: "Give the poll a question." };
  if (trimmedOptions.length < 2) return { error: "Add at least two options." };

  const [isOrganizer, member] = await Promise.all([isOrganizerForTrip(tripId), getCurrentMember(tripId)]);
  if (!isOrganizer || !member) return { error: "Only the trip organizer can start a poll." };

  const poll = await repo.createPoll(tripId, member.id, trimmedQuestion, trimmedOptions);
  revalidatePath(`/t/${tripId}/vote`);
  return { poll };
}

export async function castVoteAction(tripId: string, pollId: string, optionId: string): Promise<{ error?: string }> {
  const member = await getCurrentMember(tripId);
  if (!member) return { error: "We don't know who you are on this trip yet — try rejoining." };

  const poll = await repo.getPoll(pollId);
  if (!poll || poll.poll.status !== "open") return { error: "This poll isn't open anymore." };

  await repo.castVote(pollId, member.id, optionId);
  revalidatePath(`/t/${tripId}/vote`);
  return {};
}

export async function closePollAction(tripId: string, pollId: string): Promise<{ error?: string }> {
  const [isOrganizer, member] = await Promise.all([isOrganizerForTrip(tripId), getCurrentMember(tripId)]);
  if (!isOrganizer || !member) return { error: "Only the trip organizer can close a poll." };

  await repo.closePoll(pollId, member.id);
  revalidatePath(`/t/${tripId}/vote`);
  return {};
}
