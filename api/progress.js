import { loadProgressRow, normalizeNickname, parseStoredProgress, saveProgress } from './_lib/progress.js'
import { empty, json, readJson } from './_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const deviceToken = url.searchParams.get('deviceToken') ?? ''
    const row = await loadProgressRow(deviceToken)

    if (!row) {
      return json({ error: 'not_found' }, { status: 404 })
    }

    return json({
      nickname: row.nickname,
      progress: parseStoredProgress(row),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : new Date(row.updated_at).toISOString(),
    })
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'load_failed',
      },
      { status: 500 },
    )
  }
}

export async function POST(request) {
  try {
    const body = await readJson(request)
    const deviceToken = typeof body?.deviceToken === 'string' ? body.deviceToken : ''
    const nickname = normalizeNickname(body?.nickname)
    const progress = body?.progress

    if (!deviceToken || !nickname || !progress || typeof progress !== 'object') {
      return json({ error: 'invalid_payload' }, { status: 400 })
    }

    await saveProgress(deviceToken, nickname, progress)

    return json({
      ok: true,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'save_failed',
      },
      { status: 500 },
    )
  }
}
