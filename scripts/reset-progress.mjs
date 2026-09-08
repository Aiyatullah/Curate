// One-off: wipe attempt history and analytics back to zero. Keeps the question bank.
//   node --env-file=.env.local scripts/reset-progress.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { prepare: false });
await sql`delete from solve_sessions`;
await sql`delete from analysis_sessions`;
await sql`delete from knowledge_graph`;
await sql`delete from problem_status`;
await sql`delete from problems where source = 'ai'`;
await sql`update app_state set streak_days = 0, last_active_date = null where id = 1`;
console.log("progress reset");
await sql.end();
