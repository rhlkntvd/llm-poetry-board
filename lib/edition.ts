import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { Store } from "./store.ts";

export const models = [
  "openai/gpt-4.1-nano",
  "google/gemini-2.5-flash-lite",
  "mistralai/mistral-small-3.2-24b-instruct",
  "qwen/qwen3-30b-a3b-instruct-2507",
];
const subjects = [
  "distance",
  "a key",
  "weather",
  "hunger",
  "home",
  "a game",
  "silence",
  "a promise",
  "luck",
  "water",
  "a mistake",
  "sleep",
  "a name",
  "work",
  "a shadow",
  "waiting",
  "a gift",
  "music",
  "a crowd",
  "a secret",
  "a window",
  "change",
  "a meal",
  "an echo",
  "light",
  "an island",
  "a stranger",
  "a map",
  "a habit",
  "time",
  "a joke",
  "a garden",
];
const instructions =
  "Write an original poem in response to the prompt. Return only a JSON object with string fields title and body. Preserve line breaks in body.";
export const poem = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(6000),
});
type Settings = {
  models: string[];
  instructions: string;
  temperature: number;
  max_tokens: number;
  jsonModeModels?: string[];
  version: string;
};
export type Edition = { day: string; prompt: string; config: string };
export type Generate = (
  model: string,
  prompt: string,
  settings: Settings,
) => Promise<{ text: unknown; metadata: object }>;
export function pacificDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export async function publish(db: Store, day: string, generate: Generate) {
  const date = new Date(day + "T12:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(+date) ||
    date.toISOString().slice(0, 10) !== day ||
    [0, 6].includes(date.getUTCDay())
  )
    throw new Error("Choose a weekday in YYYY-MM-DD format");
  const recent = await db.query<Edition>(
    "SELECT prompt FROM editions WHERE day < $1 ORDER BY day DESC LIMIT 10",
    [day],
  );
  const seed = createHash("sha256").update(day).digest().readUInt32BE();
  let prompt = "";
  for (let offset = 0; offset <= recent.length; offset++) {
    const subject = subjects[(seed + offset) % subjects.length];
    prompt = `Write a poem about ${subject}.`;
    if (!recent.some((row) => row.prompt === prompt)) break;
  }
  const config = JSON.stringify({
    models,
    instructions,
    temperature: 0.8,
    max_tokens: 500,
    jsonModeModels: [
      "google/gemini-2.5-flash-lite",
      "mistralai/mistral-small-3.2-24b-instruct",
    ],
    version: "publication-v3",
    seed,
  });
  await db.query(
    "INSERT INTO editions(day,prompt,config) VALUES($1,$2,$3) ON CONFLICT(day) DO NOTHING",
    [day, prompt, config],
  );
  const [edition] = await db.query<Edition>(
    "SELECT * FROM editions WHERE day=$1",
    [day],
  );
  const settings: Settings = JSON.parse(edition.config);
  for (const model of settings.models) {
    await db.query(
      "INSERT INTO submissions(id,day,model) VALUES($1,$2,$3) ON CONFLICT(day,model) DO NOTHING",
      [randomUUID(), day, model],
    );
    const now = Date.now();
    const [claim] = await db.query<{ id: string; attempts: number }>(
      `UPDATE submissions SET claimed_at=$1, attempts=attempts+1,error=NULL
      WHERE day=$2 AND model=$3 AND body IS NULL AND attempts<3 AND (claimed_at IS NULL OR claimed_at<$4) RETURNING id,attempts`,
      [now, day, model, now - 120000],
    );
    if (!claim) continue;
    let valid: z.infer<typeof poem>;
    let metadata: string;
    try {
      const result = await generate(model, edition.prompt, settings);
      valid = poem.parse(result.text);
      metadata = JSON.stringify(result.metadata);
    } catch (error) {
      const status =
        error instanceof ProviderError
          ? error.message
          : "Generation or validation failed";
      await db.query(
        "UPDATE submissions SET error=$1,claimed_at=NULL WHERE id=$2 AND attempts=$3",
        [status, claim.id, claim.attempts],
      );
      continue;
    }
    await db.query(
      "UPDATE submissions SET title=$1,body=$2,metadata=$3,claimed_at=NULL WHERE id=$4 AND attempts=$5",
      [valid.title, valid.body, metadata, claim.id, claim.attempts],
    );
  }
  return db.query<{
    model: string;
    attempts: number;
    published: number;
    error: string | null;
  }>(
    "SELECT model,attempts,CASE WHEN body IS NULL THEN 0 ELSE 1 END AS published,error FROM submissions WHERE day=$1 ORDER BY model",
    [day],
  );
}
export class ProviderError extends Error {}
