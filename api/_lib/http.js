const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  })
}

export function empty(status = 204) {
  return new Response(null, {
    status,
    headers: corsHeaders,
  })
}

export async function readJson(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}
