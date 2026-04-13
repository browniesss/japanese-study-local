import { clearSessionCookie, destroySession } from '../_lib/auth.js'
import { empty, json } from '../_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function POST(request) {
  try {
    await destroySession(request)

    return json(
      {
        ok: true,
      },
      {
        headers: {
          'Set-Cookie': clearSessionCookie(request),
        },
      },
    )
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'logout_failed',
      },
      { status: 500 },
    )
  }
}
