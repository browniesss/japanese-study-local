import { empty, hashToken, json, loadProgressRow, normalizeNickname, parseStoredProgress, readJson } from './_shared.js'

export async function onRequestOptions() {
  return empty()
}

export async function onRequestPost({ request, env }) {
  const body = await readJson(request)
  const nickname = normalizeNickname(body?.nickname)
  const requestedToken = typeof body?.deviceToken === 'string' ? body.deviceToken : ''

  if (!nickname) {
    return json({ error: 'nickname_required' }, { status: 400 })
  }

  const existingRow = await loadProgressRow(env.DB, requestedToken)
  if (existingRow && requestedToken) {
    const tokenHash = await hashToken(requestedToken)

    await env.DB
      .prepare('UPDATE study_progress SET nickname = ?1, updated_at = datetime(\'now\') WHERE device_token_hash = ?2')
      .bind(nickname, tokenHash)
      .run()

    return json({
      nickname,
      deviceToken: requestedToken,
      progress: parseStoredProgress(existingRow),
    })
  }

  const deviceToken = crypto.randomUUID()
  const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceToken))
  const tokenHash = [...new Uint8Array(tokenHashBuffer)].map((value) => value.toString(16).padStart(2, '0')).join('')

  await env.DB
    .prepare(
      'INSERT INTO study_progress (device_token_hash, nickname, progress_json) VALUES (?1, ?2, ?3) ON CONFLICT(device_token_hash) DO UPDATE SET nickname = excluded.nickname, updated_at = datetime(\'now\')',
    )
    .bind(tokenHash, nickname, '{}')
    .run()

  return json({
    nickname,
    deviceToken,
    progress: null,
  })
}
