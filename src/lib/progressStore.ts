import { createInitialProgress, storageKey } from './progress'
import type { ProgressState } from '../types'

export type ProgressStore = {
  load: () => ProgressState
  save: (progress: ProgressState) => void
  clear: () => void
}

export const localProgressStore: ProgressStore = {
  load() {
    try {
      const raw = window.localStorage.getItem(storageKey)
      return raw ? (JSON.parse(raw) as ProgressState) : createInitialProgress()
    } catch {
      return createInitialProgress()
    }
  },
  save(progress) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress))
    } catch {
      // keep in-memory state only
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // ignore storage clear errors
    }
  },
}
