CREATE TABLE IF NOT EXISTS study_progress (
  device_token_hash TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  progress_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_study_progress_nickname
  ON study_progress (nickname);
