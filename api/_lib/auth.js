import { createHash, randomUUID } from 'node:crypto'

import { ensureSchema, getSql } from './db.js'

const sessionCookieName = 'jpstudy_session'
const sessionLifetimeSeconds = 60 * 60 * 24 * 90

export function normalizeNickname(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24)
}

function createNicknameKey(nickname) {
  return nickname.toLowerCase()
}

function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex')
}

function shouldUseSecureCookie(request) {
  const { protocol, hostname } = new URL(request.url)
  if (protocol === 'https:') {
    return true
  }

  return !['localhost', '127.0.0.1', '::1'].includes(hostname)
}

function serializeCookie(name, value, request, overrides = {}) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax']

  if (shouldUseSecureCookie(request)) {
    parts.push('Secure')
  }

  if (typeof overrides.maxAge === 'number') {
    parts.push(`Max-Age=${overrides.maxAge}`)
  }

  return parts.join('; ')
}

export function createSessionCookie(token, request) {
  return serializeCookie(sessionCookieName, token, request, { maxAge: sessionLifetimeSeconds })
}

export function clearSessionCookie(request) {
  return serializeCookie(sessionCookieName, '', request, { maxAge: 0 })
}

export function readSessionToken(request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookies = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const cookie of cookies) {
    const [name, ...rest] = cookie.split('=')
    if (name === sessionCookieName) {
      return rest.join('=')
    }
  }

  return ''
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

export async function ensureSessionSchema() {
  await ensureSchema()
}

export async function upsertUserByNickname(nickname) {
  const sql = getSql()
  const nicknameKey = createNicknameKey(nickname)

  const rows = await sql`
    insert into study_users (nickname_display, nickname_key, progress_json)
    values (${nickname}, ${nicknameKey}, null)
    on conflict (nickname_key)
    do update set nickname_display = excluded.nickname_display,
                  updated_at = now()
    returning id, nickname_display, progress_json
  `

  return rows[0] ?? null
}

export async function createSession(userId) {
  const sql = getSql()
  const sessionToken = randomUUID()
  const sessionTokenHash = hashToken(sessionToken)
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000)

  await sql`delete from study_sessions where expires_at < now()`
  await sql`
    insert into study_sessions (user_id, session_token_hash, expires_at)
    values (${userId}, ${sessionTokenHash}, ${expiresAt})
  `

  return sessionToken
}

export async function getSessionUser(request) {
  const sql = getSql()
  const sessionToken = readSessionToken(request)

  if (!sessionToken) {
    return null
  }

  const sessionTokenHash = hashToken(sessionToken)
  const rows = await sql`
    select u.id, u.nickname_display, u.progress_json
    from study_sessions s
    join study_users u on u.id = s.user_id
    where s.session_token_hash = ${sessionTokenHash}
      and s.expires_at > now()
    limit 1
  `

  const user = rows[0] ?? null
  if (!user) {
    return null
  }

  await sql`
    update study_sessions
    set last_seen_at = now()
    where session_token_hash = ${sessionTokenHash}
  `

  return user
}

export async function destroySession(request) {
  const sql = getSql()
  const sessionToken = readSessionToken(request)

  if (!sessionToken) {
    return
  }

  const sessionTokenHash = hashToken(sessionToken)
  await sql`
    delete from study_sessions
    where session_token_hash = ${sessionTokenHash}
  `
}

export async function saveUserProgress(userId, progress) {
  const sql = getSql()

  await sql`
    update study_users
    set progress_json = ${sql.json(progress)},
        updated_at = now()
    where id = ${userId}
  `
}
