import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(rootDir, 'var')
const dbPath = process.env.PROGRESS_DB_PATH
  ? path.resolve(process.env.PROGRESS_DB_PATH)
  : path.join(dataDir, 'study-progress.sqlite')

mkdirSync(path.dirname(dbPath), { recursive: true })

const db = new DatabaseSync(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS study_progress (
    device_token_hash TEXT PRIMARY KEY,
    nickname TEXT NOT NULL,
    progress_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_study_progress_nickname
  ON study_progress (nickname);
`)

function nowIso() {
  return new Date().toISOString()
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function normalizeNickname(value) {
  const nickname = String(value ?? '').trim().slice(0, 24)
  return nickname || '스터디 멤버'
}

function parseProgressJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function bootstrapProfile(nickname, requestedToken) {
  const safeNickname = normalizeNickname(nickname)

  if (requestedToken) {
    const existing = loadProgress(requestedToken)
    if (existing) {
      db.prepare(`
        UPDATE study_progress
        SET nickname = ?, updated_at = CURRENT_TIMESTAMP
        WHERE device_token_hash = ?
      `).run(safeNickname, hashToken(requestedToken))

      return {
        nickname: safeNickname,
        deviceToken: requestedToken,
        progress: existing.progress,
      }
    }
  }

  const deviceToken = randomUUID()
  db.prepare(`
    INSERT INTO study_progress (device_token_hash, nickname, progress_json, created_at, updated_at)
    VALUES (?, ?, '{}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(hashToken(deviceToken), safeNickname)

  return {
    nickname: safeNickname,
    deviceToken,
    progress: null,
  }
}

export function loadProgress(deviceToken) {
  if (!deviceToken) return null

  const row = db.prepare(`
    SELECT nickname, progress_json, updated_at
    FROM study_progress
    WHERE device_token_hash = ?
  `).get(hashToken(deviceToken))

  if (!row) return null

  return {
    nickname: row.nickname,
    progress: parseProgressJson(row.progress_json),
    updatedAt: row.updated_at,
  }
}

export function saveProgress(deviceToken, nickname, progress) {
  const safeNickname = normalizeNickname(nickname)
  db.prepare(`
    INSERT INTO study_progress (device_token_hash, nickname, progress_json, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(device_token_hash) DO UPDATE SET
      nickname = excluded.nickname,
      progress_json = excluded.progress_json,
      updated_at = CURRENT_TIMESTAMP
  `).run(hashToken(deviceToken), safeNickname, JSON.stringify(progress))

  return {
    ok: true,
    updatedAt: nowIso(),
  }
}

export function getStorageInfo() {
  return {
    kind: 'sqlite',
    path: dbPath,
  }
}
