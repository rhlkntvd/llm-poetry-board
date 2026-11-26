import { reactionStats } from "../lib/reaction-stats.ts";
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openLocal } from '../lib/store.ts';
import { publish, models, type Generate } from '../lib/edition.ts';
import { demo } from '../lib/generate.ts';
import { reviewDay } from '../lib/review.ts';

test('blind reviews recover late poems and failures, count passes, and replay without calls', async () => {
  const db = openLocal(':memory:');
  const day = '2026-11-25';
  try {
    await publish(db, day, async (...args) => args[0] === models[0]
      ? { text: null, metadata: {} } : demo(...args));
    let requests = 0;
    const review: Generate = async (_, message) => {
      const payload = JSON.parse(message);
      assert.deepEqual(Object.keys(payload).sort(), ['body','challenge','title']);
      requests++;
      return { text: requests === 1 ? null : { like: false, comment: null }, metadata: {} };
    };
    assert.deepEqual(await reviewDay(db, day, review), { planned:12, completed:8, missing:3, calls:9 });
    const plan = () => db.query<{reviewer:string,author:string}>('SELECT reviewer,author FROM review_assignments ORDER BY position');
    const before = await plan();
    assert.ok(before.every(pair => pair.reviewer !== pair.author));
    assert.equal(new Set(before.map(pair => JSON.stringify(pair))).size,12);
    await publish(db, day, demo);
    await Promise.all([reviewDay(db, day, review), reviewDay(db, day, review)]);
    assert.equal(requests,13);
    assert.deepEqual(await reviewDay(db, day, review), { planned:12, completed:12, missing:0, calls:0 });
    assert.deepEqual(await plan(),before);
  } finally { await db.close(); }
});

test('reaction rates include passes and exclude missing and failed reviews', async () => {
  const db = openLocal(':memory:');
  try {
    await publish(db, '2026-11-25', async (...args) => args[0] === models[0]
      ? { text: null, metadata: {} } : demo(...args));
    let calls = 0;
    await reviewDay(db, '2026-11-25', async () => {
      calls++;
      return { text: calls === 1 ? null : { like: calls <= 4, comment: calls <= 6 ? 'Comment' : null }, metadata: {} };
    });
    const rows = await reactionStats(db);
    const sum = (key: 'planned' | 'completed' | 'votes' | 'comments') =>
      rows.reduce((total, row) => total + row[key], 0);
    assert.deepEqual([sum('planned'), sum('completed'), sum('votes'), sum('comments')], [12, 8, 3, 5]);
  } finally { await db.close(); }
});
