import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

export type Param = string | number | null;
export interface Store {
  query<T>(statement: string, params?: Param[]): Promise<T[]>;
  close(): Promise<void>;
}
export const publishedEditions = `(SELECT e.* FROM editions e
  WHERE EXISTS (SELECT 1 FROM submissions s WHERE s.day = e.day AND s.body IS NOT NULL)) AS published_editions`;
export const schema = () =>
  ["0001_publication.sql", "0002_reviews.sql"]
    .map((file) =>
      readFileSync(join(process.cwd(), "migrations", file), "utf8"),
    )
    .join("\n");
export function mode() {
  const value = process.env.BOARD_MODE || "demo";
  if (value !== "demo" && value !== "live")
    throw new Error("BOARD_MODE must be demo or live");
  return value;
}
export function openLocal(path: string): Store {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  db.exec(schema());
  return {
    async query<T>(statement: string, params: Param[] = []) {
      const ordered: Param[] = [];
      const sql = statement.replace(/\$(\d+)/g, (_, index) => {
        ordered.push(params[Number(index) - 1]);
        return "?";
      });
      return db.prepare(sql).all(...ordered) as T[];
    },
    async close() {
      db.close();
    },
  };
}
export function openStore(): Store {
  if (mode() === "demo") {
    mkdirSync(".data", { recursive: true });
    return openLocal(".data/demo.sqlite");
  }
  if (!process.env.DATABASE_URL)
    throw new Error("Set DATABASE_URL for live mode");
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: "require",
    max: 1,
    prepare: false,
  });
  return {
    async query<T>(statement: string, params: Param[] = []) {
      return (await sql.unsafe(statement, params)) as unknown as T[];
    },
    async close() {
      await sql.end();
    },
  };
}
