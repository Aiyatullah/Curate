/**
 * Seed / re-seed the question bank from src/data/topics/*.json.
 *   npm run db:seed
 *
 * Each file is { "topic": "...", "problems": [ { id, title, difficulty, subtopic,
 * leetcodeUrl, optimalComplexity, patternTags[], companyTags[], lists[], trackOrder } ] }.
 * Re-running is safe — upserts by id, never touches solve history or status.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { db } from "./client";
import { problems, appState } from "./schema";

type SeedProblem = {
  id: string;
  title: string;
  difficulty: string;
  subtopic?: string;
  leetcodeUrl: string;
  statementMd?: string;
  optimalComplexity?: string;
  patternTags?: string[];
  companyTags?: string[];
  lists?: string[];
  trackOrder?: number;
};

type TopicFile = { topic: string; problems: SeedProblem[] };

async function main() {
  const dir = join(process.cwd(), "src/data/topics");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));

  let count = 0;
  for (const file of files) {
    const parsed: TopicFile = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const topic = parsed.topic;

    for (const r of parsed.problems) {
      const lists = r.lists ?? [];
      const row = {
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        topic,
        subtopic: r.subtopic ?? null,
        leetcodeUrl: r.leetcodeUrl,
        statementMd: r.statementMd ?? null,
        optimalComplexity: r.optimalComplexity ?? null,
        patternTags: r.patternTags ?? [],
        companyTags: r.companyTags ?? [],
        inBlind75: lists.includes("blind75"),
        inNeetcode150: lists.includes("neetcode150"),
        inGrind169: lists.includes("grind169"),
        trackOrder: r.trackOrder ?? 0,
        source: "seed" as const,
      };

      await db
        .insert(problems)
        .values(row)
        .onConflictDoUpdate({
          target: problems.id,
          set: {
            title: row.title,
            difficulty: row.difficulty,
            topic: row.topic,
            subtopic: row.subtopic,
            leetcodeUrl: row.leetcodeUrl,
            optimalComplexity: row.optimalComplexity,
            patternTags: row.patternTags,
            companyTags: row.companyTags,
            inBlind75: row.inBlind75,
            inNeetcode150: row.inNeetcode150,
            inGrind169: row.inGrind169,
            trackOrder: row.trackOrder,
          },
        });
      count++;
    }
    console.log(`  ${file.padEnd(22)} ${parsed.problems.length} problems`);
  }

  await db
    .insert(appState)
    .values({ id: 1 })
    .onConflictDoNothing({ target: appState.id });

  console.log(`\nSeeded ${count} problems across ${files.length} topics.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
