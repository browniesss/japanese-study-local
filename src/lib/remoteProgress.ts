import type { ProgressState } from '../types'

const deviceTokenKey = 'japanese-study-device-token'

type HealthResponse = {
  ok: boolean
}

type BootstrapResponse = {
  nickname: string
  deviceToken: string
  progress: Partial<ProgressState> | null
}

type ProgressResponse = {
  nickname: string
  progress: Partial<ProgressState> | null
  updatedAt: string
}

async function readJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return (await response.json()) as T
}

export function getStoredDeviceToken() {
  try {
    return window.localStorage.getItem(deviceTokenKey)
  } catch {
    return null
  }
}

export function setStoredDeviceToken(token: string) {
  try {
    window.localStorage.setItem(deviceTokenKey, token)
  } catch {
    // ignore token persistence failures
  }
}

export async function detectRemoteProgressApi() {
  try {
    const data = await readJson<HealthResponse>('/api/health', {
      headers: {
        Accept: 'application/json',
      },
    })
    return data.ok === true
  } catch {
    return false
  }
}

export async function bootstrapRemoteProfile(nickname: string, deviceToken?: string | null) {
  return readJson<BootstrapResponse>('/api/bootstrap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      nickname,
      deviceToken: deviceToken ?? '',
    }),
  })
}

export async function loadRemoteProgress(deviceToken: string) {
  return readJson<ProgressResponse>(`/api/progress?deviceToken=${encodeURIComponent(deviceToken)}`, {
    headers: {
      Accept: 'application/json',
    },
  })
}

export async function saveRemoteProgress(deviceToken: string, nickname: string, progress: ProgressState) {
  return readJson<{ ok: boolean; updatedAt: string }>('/api/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      deviceToken,
      nickname,
      progress,
    }),
  })
}
