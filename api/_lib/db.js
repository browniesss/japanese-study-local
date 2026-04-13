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
        create table if not exists study_users (
          id bigserial primary key,
          nickname_display text not null,
          nickname_key text not null unique,
          progress_json jsonb,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `

      await sql`
        create table if not exists study_sessions (
          id bigserial primary key,
          user_id bigint not null references study_users(id) on delete cascade,
          session_token_hash text not null unique,
          expires_at timestamptz not null,
          created_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now()
        )
      `

      await sql`
        create index if not exists study_users_nickname_key_idx
        on study_users (nickname_key)
      `

      await sql`
        create index if not exists study_sessions_user_id_idx
        on study_sessions (user_id)
      `

      await sql`
        create index if not exists study_sessions_expires_at_idx
        on study_sessions (expires_at)
      `
    })().catch((error) => {
      schemaPromise = null
      throw error
    })
  }

  return schemaPromise
}
