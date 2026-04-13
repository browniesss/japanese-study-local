import { ensureSessionSchema, getSessionUser, parseStoredProgress, saveUserProgress } from './_lib/auth.js'
import { empty, json, readJson } from './_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function GET(request) {
  try {
    await ensureSessionSchema()
    const user = await getSessionUser(request)

    if (!user) {
      return json({ error: 'unauthorized' }, { status: 401 })
    }

    return json({
      nickname: user.nickname_display,
      progress: parseStoredProgress(user),
      updatedAt: new Date().toISOString(),
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
    const progress = body?.progress
    await ensureSessionSchema()
    const user = await getSessionUser(request)

    if (!user) {
      return json({ error: 'unauthorized' }, { status: 401 })
    }

    if (!progress || typeof progress !== 'object') {
      return json({ error: 'invalid_payload' }, { status: 400 })
    }

    await saveUserProgress(user.id, progress)

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
