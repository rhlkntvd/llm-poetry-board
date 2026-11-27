import { openStore, mode } from "../lib/store.ts";
import { live } from "../lib/generate.ts";
import { pacificDay, type Generate } from "../lib/edition.ts";
import { reviewDay } from "../lib/review.ts";

const online = mode() === "live";
if (online && !process.env.OPENROUTER_API_KEY)
  throw new Error("Set OPENROUTER_API_KEY for live reviews");
const sample: Generate = async () => ({
  text: { like: true, comment: "Sample peer comment." },
  metadata: { source: "offline fixture" },
});
const db = openStore();
try {
  const day = process.argv[2] ?? pacificDay();
  const summary = await reviewDay(db, day, online ? live : sample);
  console.table(summary);
  if (summary.completed !== summary.planned) {
    const errors = await db.query(
      `SELECT reviewer,author,attempt,error FROM review_attempts
      WHERE day=$1 AND error IS NOT NULL ORDER BY reviewer,author,attempt`,
      [day],
    );
    if (errors.length) console.table(errors);
    process.exitCode = 1;
  }
} finally {
  await db.close();
}
