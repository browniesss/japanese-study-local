import { createProgressProfile, loadProgressRow, normalizeNickname, parseStoredProgress, updateProfileNickname } from './_lib/progress.js'
import { empty, json, readJson } from './_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function POST(request) {
  try {
    const body = await readJson(request)
    const nickname = normalizeNickname(body?.nickname)
    const requestedToken = typeof body?.deviceToken === 'string' ? body.deviceToken : ''

    if (!nickname) {
      return json({ error: 'nickname_required' }, { status: 400 })
    }

    const existingRow = await loadProgressRow(requestedToken)
    if (existingRow && requestedToken) {
      await updateProfileNickname(requestedToken, nickname)

      return json({
        nickname,
        deviceToken: requestedToken,
        progress: parseStoredProgress(existingRow),
      })
    }

    const created = await createProgressProfile(nickname)
    return json(created)
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : 'bootstrap_failed',
      },
      { status: 500 },
    )
  }
}
