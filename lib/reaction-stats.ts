import type { Store } from "./store.ts";

export async function reactionStats(db: Store, day?: string) {
  const rows = await db.query<{
    reviewer: string;
    planned: string | number;
    completed: string | number;
    votes: string | number;
    comments: string | number;
    both: string | number;
  }>(
    `SELECT a.reviewer, COUNT(*) AS planned, COUNT(r.liked) AS completed,
      COALESCE(SUM(r.liked), 0) AS votes, COUNT(r.comment) AS comments, COUNT(CASE WHEN r.liked=1 THEN r.comment END) AS both
     FROM review_assignments a LEFT JOIN review_attempts r
       ON r.day=a.day AND r.author=a.author AND r.reviewer=a.reviewer AND r.liked IS NOT NULL
     ${day ? "WHERE a.day=$1" : ""}
     GROUP BY a.reviewer ORDER BY a.reviewer`,
    day ? [day] : [],
  );
  return rows.map((row) => ({
    reviewer: row.reviewer,
    planned: Number(row.planned),
    completed: Number(row.completed),
    votes: Number(row.votes),
    comments: Number(row.comments),
    both: Number(row.both),
  }));
}
