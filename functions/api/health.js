import { empty, json } from './_shared.js'

export async function onRequestOptions() {
  return empty()
}

export async function onRequestGet() {
  return json({
    ok: true,
    service: 'japanese-study-pages-functions',
    date: new Date().toISOString(),
  })
}
