import { createSession, createSessionCookie, ensureSessionSchema, normalizeNickname, parseStoredProgress, upsertUserByNickname } from '../_lib/auth.js'
import { empty, json, readJson } from '../_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function POST(request) {
  try {
    const body = await readJson(request)
    const nickname = normalizeNickname(body?.nickname)

    if (!nickname) {
      return json({ error: 'nickname_required' }, { status: 400 })
    }

    await ensureSessionSchema()

    const user = await upsertUserByNickname(nickname)
    if (!user) {
      return json({ error: 'login_failed' }, { status: 500 })
    }

    const sessionToken = await createSession(user.id)

    return json(
      {
        authenticated: true,
        nickname: user.nickname_display,
        progress: parseStoredProgress(user),
      },
      {
        headers: {
          'Set-Cookie': createSessionCookie(sessionToken, request),
        },
      },
    )
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'login_failed',
      },
      { status: 500 },
    )
  }
}
