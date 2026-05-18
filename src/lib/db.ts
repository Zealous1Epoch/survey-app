import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "survey.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS surveys (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      redirect_url TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('choice','multi','text','rating')),
      title TEXT NOT NULL,
      options TEXT DEFAULT '[]',
      required INTEGER DEFAULT 1,
      redirect_url TEXT DEFAULT '',
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      survey_id TEXT NOT NULL,
      value TEXT NOT NULL,
      submitted_at TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
    CREATE INDEX IF NOT EXISTS idx_responses_question ON responses(question_id);
  `);

  // Migration: add image_url column if missing
  const qCols = db.pragma("table_info(questions)") as Array<{ name: string }>;
  if (!qCols.some((c) => c.name === "image_url")) {
    db.exec(`ALTER TABLE questions ADD COLUMN image_url TEXT DEFAULT ''`);
  }

  // Migration: add submission_id column if missing
  const rCols = db.pragma("table_info(responses)") as Array<{ name: string }>;
  if (!rCols.some((c) => c.name === "submission_id")) {
    db.exec(`ALTER TABLE responses ADD COLUMN submission_id TEXT DEFAULT ''`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_responses_submission ON responses(submission_id)`);
  }

  return db;
}
