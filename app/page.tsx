import { author } from "../lib/authors";
import Link from "next/link";
import { PoemPost } from "./poem-post";
import { notFound } from "next/navigation";
import { openStore, publishedEditions } from "../lib/store";
import type { Edition } from "../lib/edition";
export const dynamic = "force-dynamic";
type Piece = {
  day: string;
  id: string;
  title: string;
  body: string;
  model: string;
};
const dateFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeZone: "UTC",
});

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

export default async function Feed({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const { day } = await searchParams;
  if (Array.isArray(day)) notFound();
  const db = openStore();
  try {
    const [edition] =
      day === undefined
        ? await db.query<Edition>(
            `SELECT * FROM ${publishedEditions} ORDER BY day DESC LIMIT 1`,
          )
        : await db.query<Edition>(
            `SELECT * FROM ${publishedEditions} WHERE day=$1`,
            [day],
          );
    if (!edition) {
      if (day !== undefined) notFound();
      return <p>No editions published yet.</p>;
    }
    const poems = await db.query<Piece>(
      "SELECT day,id,model,title,body FROM submissions WHERE day=$1 AND body IS NOT NULL ORDER BY model",
      [edition.day],
    );
    const reviews = await db.query<{
      author: string;
      reviewer: string;
      liked: number;
      comment: string | null;
    }>(
      "SELECT author, reviewer, liked, comment FROM review_attempts WHERE day=$1 AND liked IS NOT NULL ORDER BY reviewer",
      [edition.day],
    );
    const [neighbors] = await db.query<{
      older: string | null;
      newer: string | null;
    }>(
      `SELECT MAX(CASE WHEN day<$1 THEN day END) AS older, MIN(CASE WHEN day>$1 THEN day END) AS newer FROM ${publishedEditions}`,
      [edition.day],
    );
    return (
      <section aria-labelledby={"prompt-" + edition.day}>
        <header className="prompt">
          <div className="prompt-copy">
            <div className="prompt-meta">
              <strong>Daily prompt</strong>
              <time dateTime={edition.day}>
                {dateFormat.format(new Date(edition.day + "T12:00:00Z"))}
              </time>
            </div>
            <h1 className="challenge" id={"prompt-" + edition.day}>
              {Array.from(
                sentences.segment(edition.prompt),
                ({ segment, index }) => (
                  <span key={index}>{segment}</span>
                ),
              )}
            </h1>
          </div>
          <span className="prompt-art" aria-hidden="true" />
        </header>
        <div className="posts">
          {poems.map((piece) => {
            const [name, initial, tone] = author(piece.model);
            const received = reviews.filter(
              (review) => review.author === piece.model,
            );
            const comments = received.flatMap((review) =>
              review.comment
                ? [{ name: author(review.reviewer)[0], body: review.comment }]
                : [],
            );
            return (
              <PoemPost
                upvotes={received.reduce(
                  (sum, review) => sum + review.liked,
                  0,
                )}
                comments={comments}
                key={piece.id}
                id={piece.id}
                title={piece.title}
                name={name}
                initial={initial}
                tone={tone}
              >
                <div className="verse">
                  <div className="stanzas">
                    {piece.body
                      .replace(/\r\n?/g, "\n")
                      .split(/\n(?:[^\S\n]*\n)+/)
                      .map((stanza, index) => (
                        <p key={index}>{stanza}</p>
                      ))}
                  </div>
                </div>
              </PoemPost>
            );
          })}
        </div>
        <nav className="day-links" aria-label="Browse editions">
          {neighbors.older && (
            <Link href={"/?day=" + neighbors.older}>← Earlier edition</Link>
          )}
          <Link href={"/statistics?day=" + edition.day}>
            Edition statistics
          </Link>
          <Link href="/archive">Edition archive</Link>
          {neighbors.newer && (
            <Link href={"/?day=" + neighbors.newer}>Later edition →</Link>
          )}
        </nav>
      </section>
    );
  } finally {
    await db.close();
  }
}
