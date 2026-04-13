import { createHash, randomUUID } from 'node:crypto'

import { ensureSchema, getSql } from './db.js'

export function normalizeNickname(value) {
  const normalized = String(value ?? '')
    .trim()
    .slice(0, 24)

  return normalized || '스터디 멤버'
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

export function parseStoredProgress(row) {
  if (!row?.progress_json) {
    return null
  }

  if (typeof row.progress_json === 'object') {
    return row.progress_json
  }

  try {
    return JSON.parse(row.progress_json)
  } catch {
    return null
  }
}

export async function loadProgressRow(deviceToken) {
  if (!deviceToken) {
    return null
  }

  const sql = getSql()
  await ensureSchema()

  const tokenHash = hashToken(deviceToken)
  const rows = await sql`
    select nickname, progress_json, updated_at
    from study_progress
    where device_token_hash = ${tokenHash}
    limit 1
  `

  return rows[0] ?? null
}

export async function createProgressProfile(nickname) {
  const sql = getSql()
  await ensureSchema()

  const deviceToken = randomUUID()
  const tokenHash = hashToken(deviceToken)

  await sql`
    insert into study_progress (device_token_hash, nickname, progress_json)
    values (${tokenHash}, ${nickname}, ${sql.json({})})
    on conflict (device_token_hash)
    do update set nickname = excluded.nickname, updated_at = now()
  `

  return {
    nickname,
    deviceToken,
    progress: null,
  }
}

export async function updateProfileNickname(deviceToken, nickname) {
  const sql = getSql()
  await ensureSchema()

  const tokenHash = hashToken(deviceToken)

  await sql`
    update study_progress
    set nickname = ${nickname},
        updated_at = now()
    where device_token_hash = ${tokenHash}
  `
}

export async function saveProgress(deviceToken, nickname, progress) {
  const sql = getSql()
  await ensureSchema()

  const tokenHash = hashToken(deviceToken)

  await sql`
    insert into study_progress (device_token_hash, nickname, progress_json, created_at, updated_at)
    values (${tokenHash}, ${nickname}, ${sql.json(progress)}, now(), now())
    on conflict (device_token_hash)
    do update set nickname = excluded.nickname,
                  progress_json = excluded.progress_json,
                  updated_at = now()
  `
}
