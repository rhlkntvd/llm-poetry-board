import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openLocal, publishedEditions } from '../lib/store.ts';
import { publish, pacificDay, models, type Generate } from '../lib/edition.ts';
import { demo, live } from '../lib/generate.ts';

test('one immutable edition and four independent submissions across concurrent runs and replay', async () => {
  const db = openLocal(':memory:');
  try {
    const calls: string[] = [];
    const generate: Generate = async (model,prompt,settings) => {
      calls.push(JSON.stringify([prompt,settings.instructions]));
      return demo(model,prompt,settings);
    };
    const run = () => publish(db,'2026-11-25',generate);
    const snapshot = async () => [await db.query('SELECT * FROM editions'), await db.query('SELECT * FROM submissions ORDER BY id')];
    await Promise.all([run(),run()]);
    const before = await snapshot();
    assert.deepEqual(before.map(rows => rows.length),[1,4]);
    await run();
    assert.deepEqual(await snapshot(),before);
    assert.equal(calls.length,4);
    assert.equal(new Set(calls).size,1);
  } finally { await db.close(); }
});

test('reconciliation retries only the missing poem', async () => {
  const db = openLocal(':memory:');
  try {
    const first = await publish(db,'2026-11-25',async (model,prompt,settings) => model === models[0]
      ? { text: { title: 'Missing body' }, metadata: {} } : demo(model,prompt,settings));
    assert.equal(first.filter(row => row.published).length,3);
    const second = await publish(db,'2026-11-25',demo);
    assert.ok(second.every(row => row.published && row.attempts === (row.model === models[0] ? 2 : 1)));
  } finally { await db.close(); }
});

test('Pacific date accounts for midnight, summer offset and winter offset', () => {
  assert.equal(pacificDay(new Date('2026-06-02T07:15:00Z')), '2026-06-02');
  assert.equal(pacificDay(new Date('2026-12-02T07:15:00Z')), '2026-12-01');
});

test('new editions request JSON mode for Gemini and Mistral on the first attempt', async t => {
  const db = openLocal(':memory:');
  const requests = new Map<string, unknown>();
  t.mock.method(globalThis, 'fetch', async (_url: string, init: RequestInit) => {
    const request = JSON.parse(String(init.body));
    requests.set(request.model, request.response_format);
    return Response.json({ choices: [{ message: { content: JSON.stringify({ title: 'Rain', body: 'A drop falls.' }) } }] });
  });
  try {
    const rows = await publish(db, '2026-11-26', live);
    assert.ok(rows.every(row => row.published && row.attempts === 1));
    assert.equal(requests.size, 4);
    assert.deepEqual(requests.get('google/gemini-2.5-flash-lite'), { type: 'json_object' });
    assert.deepEqual(requests.get('mistralai/mistral-small-3.2-24b-instruct'), { type: 'json_object' });
    assert.equal(requests.get('openai/gpt-4.1-nano'), undefined);
    assert.equal(requests.get('qwen/qwen3-30b-a3b-instruct-2507'), undefined);
  } finally { await db.close(); }
});

test('an edition becomes visible after its first successful submission', async () => {
  const db = openLocal(':memory:');
  try {
    const days = () => db.query<{ day: string }>(`SELECT day FROM ${publishedEditions} ORDER BY day DESC`);
    await publish(db, '2026-11-24', demo);
    const failure: Generate = async () => { throw new Error('Unavailable'); };
    await publish(db, '2026-11-25', failure);
    assert.deepEqual((await days()).map(row => row.day), ['2026-11-24']);
    await publish(db, '2026-11-25', (model, prompt, settings) =>
      (model === models[0] ? demo : failure)(model, prompt, settings));
    assert.deepEqual((await days()).map(row => row.day), ['2026-11-25', '2026-11-24']);
  } finally { await db.close(); }
});

test('a failed poem write surfaces the database error', async () => {
  const db = openLocal(':memory:');
  try {
    await db.query(`CREATE TRIGGER fail_save BEFORE UPDATE OF body ON submissions
      BEGIN SELECT RAISE(ABORT, 'poem write failed'); END`);
    await assert.rejects(publish(db, '2026-11-25', demo), /poem write failed/);
    const [submission] = await db.query<{ error: string | null }>('SELECT error FROM submissions');
    assert.equal(submission.error, null);
  } finally { await db.close(); }
});
