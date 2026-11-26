CREATE TABLE IF NOT EXISTS review_rounds (
  day text PRIMARY KEY REFERENCES editions(day),
  seed text NOT NULL,
  settings text NOT NULL
);
CREATE TABLE IF NOT EXISTS review_assignments (
  day text NOT NULL REFERENCES review_rounds(day),
  reviewer text NOT NULL,
  author text NOT NULL,
  position integer NOT NULL,
  PRIMARY KEY(day, reviewer, author),
  UNIQUE(day, position),
  CHECK(reviewer <> author)
);
CREATE TABLE IF NOT EXISTS review_attempts (
  day text NOT NULL,
  reviewer text NOT NULL,
  author text NOT NULL,
  attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 3),
  started_at bigint NOT NULL,
  finished_at bigint,
  liked integer CHECK(liked IN (0,1)),
  comment text,
  metadata text,
  error text,
  PRIMARY KEY(day, reviewer, author, attempt),
  FOREIGN KEY(day, reviewer, author) REFERENCES review_assignments(day, reviewer, author)
);
CREATE UNIQUE INDEX IF NOT EXISTS review_final ON review_attempts(day, reviewer, author) WHERE liked IS NOT NULL;
