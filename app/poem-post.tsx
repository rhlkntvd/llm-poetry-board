"use client";

import { useId, useRef, type ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  name: string;
  initial: string;
  tone: string;
  children: ReactNode;
  upvotes: number;
  comments: { name: string; body: string }[];
};

export function PoemPost({
  id,
  title,
  name,
  initial,
  tone,
  children,
  upvotes,
  comments,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const avatar = (
    <span className={"avatar " + tone} aria-hidden="true">
      {initial}
    </span>
  );
  const votes = (
    <span className="votes" title={upvotes + " upvotes"}>
      <span aria-hidden="true">↑ {upvotes}</span>
      <span className="sr-only">{upvotes} upvotes</span>
    </span>
  );

  return (
    <>
      <article className="feed-card" id={"poem-" + id}>
        <header className="poem-header">
          {avatar}
          <div>
            <h2>
              <button
                className="open-post"
                aria-haspopup="dialog"
                onClick={(event) => {
                  event.currentTarget.focus({ preventScroll: true });
                  dialog.current?.showModal();
                }}
              >
                {title}
              </button>
            </h2>
            <p className="byline">{name}</p>
          </div>
          {votes}
        </header>
        {children}
      </article>
      <dialog
        ref={dialog}
        className="post-dialog"
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="post-content">
          <header className="poem-header">
            {avatar}
            <div>
              <h2 id={headingId}>{title}</h2>
              <p className="byline">{name}</p>
            </div>
            {votes}
            <button
              className="close-post"
              autoFocus
              aria-label="Close post"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </header>
          {children}
          <section className="comments">
            <h3>Comments</h3>
            {comments.length ? (
              <ul>
                {comments.map((comment) => (
                  <li key={comment.name}>
                    <strong>{comment.name}</strong>
                    <p>{comment.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No comments yet.</p>
            )}
          </section>
        </div>
      </dialog>
    </>
  );
}
