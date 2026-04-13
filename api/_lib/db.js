import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL ?? ''

let sqlClient = null
let schemaPromise = null

function createClient() {
  if (!connectionString) {
    throw new Error('database_url_missing')
  }

  return postgres(connectionString, {
    ssl: 'require',
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  })
}

export function getSql() {
  if (!sqlClient) {
    sqlClient = createClient()
  }

  return sqlClient
}

export async function ensureSchema() {
  if (!schemaPromise) {
    const sql = getSql()

    schemaPromise = (async () => {
      await sql`
        create table if not exists study_progress (
          device_token_hash text primary key,
          nickname text not null,
          progress_json jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `

      await sql`
        create index if not exists study_progress_nickname_idx
        on study_progress (nickname)
      `
    })().catch((error) => {
      schemaPromise = null
      throw error
    })
  }

  return schemaPromise
}
