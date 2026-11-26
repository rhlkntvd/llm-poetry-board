import type { Store } from './store.ts';

export async function reactionStats(db: Store) {
  const rows = await db.query<{ reviewer: string, planned: string | number, completed: string | number, votes: string | number, comments: string | number }>(
    `SELECT a.reviewer, COUNT(*) AS planned, COUNT(r.liked) AS completed,
      COALESCE(SUM(r.liked), 0) AS votes, COUNT(r.comment) AS comments
     FROM review_assignments a LEFT JOIN review_attempts r
       ON r.day=a.day AND r.author=a.author AND r.reviewer=a.reviewer AND r.liked IS NOT NULL
     GROUP BY a.reviewer ORDER BY a.reviewer`
  );
  return rows.map(row => ({ reviewer: row.reviewer, planned: Number(row.planned),
    completed: Number(row.completed), votes: Number(row.votes), comments: Number(row.comments) }));
}
