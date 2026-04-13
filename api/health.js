import { ensureSchema, getSql } from './_lib/db.js'
import { json, empty } from './_lib/http.js'

export function OPTIONS() {
  return empty()
}

export async function GET() {
  try {
    const sql = getSql()
    await ensureSchema()
    await sql`select 1 as ok`

    return json({
      ok: true,
      storage: 'postgres',
      auth: 'nickname-session',
    })
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'database_unavailable',
      },
      { status: 503 },
    )
  }
}
