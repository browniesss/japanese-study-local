import type { ProgressState } from '../types'

type HealthResponse = {
  ok: boolean
}

type AuthResponse = {
  authenticated: boolean
  nickname: string
  progress: Partial<ProgressState> | null
}

type ProgressResponse = {
  nickname: string
  progress: Partial<ProgressState> | null
  updatedAt: string
}

async function readJson<T>(input: RequestInfo, init?: RequestInit, allowedStatuses: number[] = []) {
  const response = await fetch(input, init)

  if (!response.ok && !allowedStatuses.includes(response.status)) {
    throw new Error(`request_failed_${response.status}`)
  }

  if (response.status === 204) {
    return null as T
  }

  return (await response.json()) as T
}

export async function detectRemoteProgressApi() {
  try {
    const data = await readJson<HealthResponse>('/api/health', {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
      },
    })
    return data.ok === true
  } catch {
    return false
  }
}

export async function loadRemoteSession() {
  const response = await fetch('/api/auth/me', {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(`request_failed_${response.status}`)
  }

  return (await response.json()) as AuthResponse
}

export async function loginRemoteProfile(nickname: string) {
  return readJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      nickname,
    }),
  })
}

export async function logoutRemoteProfile() {
  return readJson<{ ok: boolean }>('/api/auth/logout', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  })
}

export async function loadRemoteProgress() {
  return readJson<ProgressResponse>('/api/progress', {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
    },
  }, [401])
}

export async function saveRemoteProgress(progress: ProgressState) {
  return readJson<{ ok: boolean; updatedAt: string }>('/api/progress', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      progress,
    }),
  })
}
