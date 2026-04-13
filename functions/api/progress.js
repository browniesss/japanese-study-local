import { empty, hashToken, json, loadProgressRow, normalizeNickname, parseStoredProgress, readJson } from './_shared.js'

export async function onRequestOptions() {
  return empty()
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url)
  const deviceToken = url.searchParams.get('deviceToken') ?? ''
  const row = await loadProgressRow(env.DB, deviceToken)

  if (!row) {
    return json({ error: 'not_found' }, { status: 404 })
  }

  return json({
    nickname: row.nickname,
    progress: parseStoredProgress(row),
    updatedAt: row.updated_at,
  })
}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request)
  const deviceToken = typeof body?.deviceToken === 'string' ? body.deviceToken : ''
  const nickname = normalizeNickname(body?.nickname)
  const progress = body?.progress

  if (!deviceToken || !nickname || !progress || typeof progress !== 'object') {
    return json({ error: 'invalid_payload' }, { status: 400 })
  }

  const tokenHash = await hashToken(deviceToken)

  await env.DB
    .prepare(
      'INSERT INTO study_progress (device_token_hash, nickname, progress_json, created_at, updated_at) VALUES (?1, ?2, ?3, datetime(\'now\'), datetime(\'now\')) ON CONFLICT(device_token_hash) DO UPDATE SET nickname = excluded.nickname, progress_json = excluded.progress_json, updated_at = datetime(\'now\')',
    )
    .bind(tokenHash, nickname, JSON.stringify(progress))
    .run()

  return json({
    ok: true,
    updatedAt: new Date().toISOString(),
  })
}
