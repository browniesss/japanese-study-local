const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  })
}

export function empty(status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders,
  })
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export function normalizeNickname(value) {
  const normalized = String(value ?? '')
    .trim()
    .slice(0, 24)

  return normalized || '스터디 멤버'
}

export async function hashToken(token) {
  const encoder = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token))
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('')
}

export async function loadProgressRow(db, deviceToken) {
  if (!deviceToken) return null
  const tokenHash = await hashToken(deviceToken)
  return db
    .prepare('SELECT nickname, progress_json, updated_at FROM study_progress WHERE device_token_hash = ?1')
    .bind(tokenHash)
    .first()
}

export function parseStoredProgress(row) {
  if (!row?.progress_json) return null

  try {
    return JSON.parse(row.progress_json)
  } catch {
    return null
  }
}
