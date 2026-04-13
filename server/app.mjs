import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { createReadStream, existsSync } from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'
import { bootstrapProfile, getStorageInfo, loadProgress, saveProgress } from './progress-store.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const publicDir = path.join(rootDir, 'public')
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 8080)

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon',
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload))
}

function empty(response, statusCode = 204) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end()
}

async function readRequestJson(request) {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (!chunks.length) return null

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return null
  }
}

function resolveStaticPath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split('?')[0])
  const candidates = [
    path.join(distDir, normalized),
    path.join(publicDir, normalized),
  ]

  for (const candidate of candidates) {
    const safePath = path.normalize(candidate)
    if ((safePath.startsWith(distDir) || safePath.startsWith(publicDir)) && existsSync(safePath)) {
      return safePath
    }
  }

  return null
}

async function serveFile(filePath, response) {
  const info = await stat(filePath)

  if (info.isDirectory()) {
    return serveFile(path.join(filePath, 'index.html'), response)
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
    'Cache-Control': filePath.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  })

  await pipeline(createReadStream(filePath), response)
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'OPTIONS') {
    empty(response)
    return
  }

  if (url.pathname === '/api/health' && request.method === 'GET') {
    json(response, 200, {
      ok: true,
      storage: getStorageInfo(),
      date: new Date().toISOString(),
    })
    return
  }

  if (url.pathname === '/api/bootstrap' && request.method === 'POST') {
    const body = await readRequestJson(request)
    const session = bootstrapProfile(body?.nickname, typeof body?.deviceToken === 'string' ? body.deviceToken : '')
    json(response, 200, session)
    return
  }

  if (url.pathname === '/api/progress' && request.method === 'GET') {
    const row = loadProgress(url.searchParams.get('deviceToken') ?? '')
    if (!row) {
      json(response, 404, { error: 'not_found' })
      return
    }

    json(response, 200, row)
    return
  }

  if (url.pathname === '/api/progress' && request.method === 'POST') {
    const body = await readRequestJson(request)
    if (!body?.deviceToken || !body?.progress || typeof body.progress !== 'object') {
      json(response, 400, { error: 'invalid_payload' })
      return
    }

    const result = saveProgress(body.deviceToken, body.nickname, body.progress)
    json(response, 200, result)
    return
  }

  const staticPath = resolveStaticPath(url.pathname === '/' ? '/index.html' : url.pathname)

  if (staticPath) {
    try {
      await serveFile(staticPath, response)
      return
    } catch {
      json(response, 500, { error: 'file_read_failed' })
      return
    }
  }

  try {
    const indexHtml = await readFile(path.join(distDir, 'index.html'))
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    })
    response.end(indexHtml)
  } catch {
    json(response, 500, { error: 'missing_dist_build' })
  }
})

server.listen(port, host, () => {
  console.log(`Oracle-ready app server running at http://${host}:${port}`)
  console.log(`Static root: ${distDir}`)
  console.log(`Storage:`, getStorageInfo())
})
