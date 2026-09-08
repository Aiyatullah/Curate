/**
 * Seed / re-seed all reference data.
 *   npm run db:seed
 *
 * Sources (all upsert by id — safe to re-run, never touches your history):
 *   src/data/topics/*.json      -> problems           (Phase 1)
 *   src/data/challenges/*.json  -> challenges          (Phase 3)
 *   src/data/companies.json     -> companies           (Phase 5)
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { db } from "./client";
import { problems, appState, challenges, companies } from "./schema";

const ROOT = process.cwd();

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

async function seedProblems(): Promise<number> {
  const dir = join(ROOT, "src/data/topics");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let count = 0;
  for (const file of files) {
    const parsed: { topic: string; problems: SeedProblem[] } = JSON.parse(
      readFileSync(join(dir, file), "utf8"),
    );
    for (const r of parsed.problems) {
      const lists = r.lists ?? [];
      const row = {
        id: r.id,
        title: r.title,
        difficulty: r.difficulty,
        topic: parsed.topic,
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
  return count;
}

type SeedChallenge = {
  id: string;
  title: string;
  difficulty: string;
  prompt: string;
  requirements?: string[];
  evalRubric?: string;
  companyTags?: string[];
  referenceUrl?: string;
  trackOrder?: number;
};

async function seedChallenges(): Promise<number> {
  const dir = join(ROOT, "src/data/challenges");
  if (!existsSync(dir)) return 0;
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  let count = 0;
  for (const file of files) {
    const parsed: { kind: string; challenges: SeedChallenge[] } = JSON.parse(
      readFileSync(join(dir, file), "utf8"),
    );
    for (const c of parsed.challenges) {
      const row = {
        id: c.id,
        kind: parsed.kind,
        title: c.title,
        difficulty: c.difficulty,
        prompt: c.prompt,
        requirements: c.requirements ?? [],
        evalRubric: c.evalRubric ?? null,
        companyTags: c.companyTags ?? [],
        referenceUrl: c.referenceUrl ?? null,
        trackOrder: c.trackOrder ?? 0,
        source: "seed" as const,
      };
      await db
        .insert(challenges)
        .values(row)
        .onConflictDoUpdate({
          target: challenges.id,
          set: {
            kind: row.kind,
            title: row.title,
            difficulty: row.difficulty,
            prompt: row.prompt,
            requirements: row.requirements,
            evalRubric: row.evalRubric,
            companyTags: row.companyTags,
            trackOrder: row.trackOrder,
          },
        });
      count++;
    }
    console.log(`  ${file.padEnd(22)} ${parsed.challenges.length} challenges`);
  }
  return count;
}

type SeedCompany = {
  slug: string;
  name: string;
  tags?: string[];
  focusAreas?: string[];
  priority?: number;
};

async function seedCompanies(): Promise<number> {
  const file = join(ROOT, "src/data/companies.json");
  if (!existsSync(file)) return 0;
  const list: SeedCompany[] = JSON.parse(readFileSync(file, "utf8"));
  for (const c of list) {
    await db
      .insert(companies)
      .values({
        slug: c.slug,
        name: c.name,
        tags: c.tags ?? [],
        focusAreas: c.focusAreas ?? [],
        priority: c.priority ?? 3,
      })
      .onConflictDoUpdate({
        target: companies.slug,
        set: {
          name: c.name,
          tags: c.tags ?? [],
          focusAreas: c.focusAreas ?? [],
        },
      });
  }
  return list.length;
}

async function main() {
  const p = await seedProblems();
  const c = await seedChallenges();
  const co = await seedCompanies();
  await db
    .insert(appState)
    .values({ id: 1 })
    .onConflictDoNothing({ target: appState.id });
  console.log(`\nSeeded ${p} problems, ${c} challenges, ${co} companies.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
