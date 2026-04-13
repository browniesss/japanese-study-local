import { ensureSessionSchema, getSessionUser, parseStoredProgress } from '../_lib/auth.js'
import { empty, json } from '../_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function GET(request) {
  try {
    await ensureSessionSchema()
    const user = await getSessionUser(request)

    if (!user) {
      return json(
        {
          authenticated: false,
        },
        { status: 401 },
      )
    }

    return json({
      authenticated: true,
      nickname: user.nickname_display,
      progress: parseStoredProgress(user),
    })
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'session_lookup_failed',
      },
      { status: 500 },
    )
  }
}
