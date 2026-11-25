CREATE TABLE IF NOT EXISTS editions (
  day text PRIMARY KEY,
  prompt text NOT NULL,
  config text NOT NULL
);
CREATE TABLE IF NOT EXISTS submissions (
  id text PRIMARY KEY,
  day text NOT NULL REFERENCES editions(day),
  model text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  claimed_at bigint,
  title text,
  body text,
  metadata text,
  error text,
  UNIQUE(day, model),
  CHECK ((title IS NULL) = (body IS NULL))
);
