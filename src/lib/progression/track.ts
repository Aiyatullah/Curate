/**
 * The fixed learning track for Phase 1. Topic strings MUST match the `topic`
 * field in src/data/topics/*.json exactly. The recommender walks this order and
 * only suggests problems from the earliest topic that isn't "mastered".
 */
export const TRACK: string[] = [
  "Arrays",
  "Hash Maps",
  "Two Pointers",
  "Sliding Window",
  "Stack",
  "Binary Search",
  "Linked List",
  "Strings",
  "Matrix",
  "Trees",
  "Tries",
  "Heap / Priority Queue",
  "Backtracking",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Intervals",
  "Math & Bit Manipulation",
  "Advanced Algorithms",
];

// A topic counts as "mastered" once this many of its problems are solved.
export const TOPIC_MASTERY_THRESHOLD = 8;

export function nextTopic(solvedByTopic: Record<string, number>): string {
  for (const topic of TRACK) {
    if ((solvedByTopic[topic] ?? 0) < TOPIC_MASTERY_THRESHOLD) return topic;
  }
  return TRACK[TRACK.length - 1];
}
