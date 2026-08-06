import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL || "";

function parseDbUrl(url: string) {
  // 格式: mysql://user:password@host:port/database
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1),
  };
}

let pool: mysql.Pool | null = null;
let initialized = false;

/** 获取数据库连接池，首次调用时自动初始化表结构 */
export async function getDb(): Promise<mysql.Pool> {
  if (!pool) {
    if (!DB_URL) {
      throw new Error("DATABASE_URL 环境变量未设置");
    }
    const config = parseDbUrl(DB_URL);
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
    });
  }

  if (!initialized) {
    await initTables(pool);
    initialized = true;
  }

  return pool;
}

async function initTables(p: mysql.Pool): Promise<void> {
  await p.execute(`
    CREATE TABLE IF NOT EXISTS surveys (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      description TEXT,
      redirect_url VARCHAR(2000) DEFAULT '',
      created_at VARCHAR(30) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS questions (
      id VARCHAR(36) PRIMARY KEY,
      survey_id VARCHAR(36) NOT NULL,
      type VARCHAR(10) NOT NULL,
      title VARCHAR(500) NOT NULL,
      options TEXT DEFAULT ('[]'),
      required INT DEFAULT 1,
      redirect_url VARCHAR(2000) DEFAULT '',
      image_url VARCHAR(2000) DEFAULT '',
      \`order\` INT DEFAULT 0,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await p.execute(`
    CREATE TABLE IF NOT EXISTS responses (
      id VARCHAR(36) PRIMARY KEY,
      question_id VARCHAR(36) NOT NULL,
      survey_id VARCHAR(36) NOT NULL,
      value TEXT NOT NULL,
      submitted_at VARCHAR(30) NOT NULL,
      submission_id VARCHAR(36) DEFAULT '',
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // 索引（MySQL 中 CREATE INDEX IF NOT EXISTS 从 8.0.31 开始支持）
  try { await p.execute(`CREATE INDEX idx_questions_survey ON questions(survey_id)`); } catch (_) {}
  try { await p.execute(`CREATE INDEX idx_responses_survey ON responses(survey_id)`); } catch (_) {}
  try { await p.execute(`CREATE INDEX idx_responses_question ON responses(question_id)`); } catch (_) {}
  try { await p.execute(`CREATE INDEX idx_responses_submission ON responses(submission_id)`); } catch (_) {}

  // 迁移：检查 image_url 列是否存在
  const [qCols] = await p.query(`SHOW COLUMNS FROM questions`) as any;
  if (!(qCols as any[]).some((c: any) => c.Field === "image_url")) {
    await p.execute(`ALTER TABLE questions ADD COLUMN image_url VARCHAR(2000) DEFAULT ''`);
  }

  // 迁移：检查 submission_id 列是否存在
  const [rCols] = await p.query(`SHOW COLUMNS FROM responses`) as any;
  if (!(rCols as any[]).some((c: any) => c.Field === "submission_id")) {
    await p.execute(`ALTER TABLE responses ADD COLUMN submission_id VARCHAR(36) DEFAULT ''`);
    try { await p.execute(`CREATE INDEX idx_responses_submission ON responses(submission_id)`); } catch (_) {}
  }
}