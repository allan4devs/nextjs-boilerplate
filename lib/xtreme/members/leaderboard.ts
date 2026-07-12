import { toPublicMember } from "./presenter";
import type { MemberRepository } from "./repository";

export async function getMemberLeaderboard(
  repository: MemberRepository,
  today: string,
) {
  const docs = await repository.listLeaderboardCandidates();

  return docs
    .map((doc) => toPublicMember(doc, today))
    .sort(
      (a, b) =>
        b.streak - a.streak ||
        b.totalWorkouts - a.totalWorkouts ||
        b.totalMinutes - a.totalMinutes ||
        a.memberName.localeCompare(b.memberName),
    )
    .slice(0, 12);
}
