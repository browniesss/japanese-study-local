import type { Lesson, ProgressState, ReviewStat, Unit } from '../types'

export const storageKey = 'japanese-study-local-progress'

const xpPerLevel = 120

export function createInitialProgress(): ProgressState {
  return {
    completedLessonIds: [],
    xp: 0,
    streak: 0,
    lastStudiedOn: null,
    badgeIds: [],
    weeklyGoal: 4,
    weeklyCompletions: 0,
    weeklyKey: getWeekKey(),
    nickname: '',
    selectedCourseId: 'starter',
    onboardingComplete: false,
    learnerProfile: 'starter',
    reviewStats: {},
    speakingStats: {
      attempts: 0,
      matched: 0,
      close: 0,
      needsWork: 0,
      recent: [],
    },
    settings: {
      showRomaji: true,
      audioRate: 0.9,
    },
  }
}

export function recordSpeakingAssessment(
  progress: ProgressState,
  assessment: 'matched' | 'close' | 'needs-work',
): ProgressState {
  const today = getTodayKey()
  const nextRecent = [{ date: today, assessment }, ...progress.speakingStats.recent].slice(0, 30)

  return {
    ...progress,
    speakingStats: {
      attempts: progress.speakingStats.attempts + 1,
      matched: progress.speakingStats.matched + (assessment === 'matched' ? 1 : 0),
      close: progress.speakingStats.close + (assessment === 'close' ? 1 : 0),
      needsWork: progress.speakingStats.needsWork + (assessment === 'needs-work' ? 1 : 0),
      recent: nextRecent,
    },
  }
}

export function completeLesson(progress: ProgressState, lesson: Lesson, units: Unit[]): ProgressState {
  const alreadyCompleted = progress.completedLessonIds.includes(lesson.id)
  const today = getTodayKey()
  const weeklyKey = getWeekKey()
  const completedLessonIds = alreadyCompleted
    ? progress.completedLessonIds
    : [...progress.completedLessonIds, lesson.id]

  const nextWeeklyCompletions =
    progress.weeklyKey === weeklyKey
      ? progress.weeklyCompletions + (alreadyCompleted ? 0 : 1)
      : alreadyCompleted
        ? 0
        : 1

  const nextState: ProgressState = {
    ...progress,
    completedLessonIds,
    xp: progress.xp + (alreadyCompleted ? 0 : lesson.xp),
    lastStudiedOn: today,
    streak: computeNextStreak(progress.lastStudiedOn, today, progress.streak),
    weeklyKey,
    weeklyCompletions: nextWeeklyCompletions,
  }

  return unlockBadges(nextState, units)
}

export function completeReviewSession(
  progress: ProgressState,
  results: { reviewItemId: string; correct: boolean }[],
): ProgressState {
  const today = getTodayKey()
  const weeklyKey = getWeekKey()
  const reviewStats = { ...progress.reviewStats }
  const earnedXp = results.reduce((sum, result) => sum + (result.correct ? 6 : 2), 0)

  results.forEach((result) => {
    const current: ReviewStat = reviewStats[result.reviewItemId] ?? {
      correct: 0,
      incorrect: 0,
      lastReviewedOn: null,
      lastOutcome: null,
    }

    reviewStats[result.reviewItemId] = {
      correct: current.correct + (result.correct ? 1 : 0),
      incorrect: current.incorrect + (result.correct ? 0 : 1),
      lastReviewedOn: today,
      lastOutcome: result.correct ? 'correct' : 'incorrect',
    }
  })

  return {
    ...progress,
    xp: progress.xp + earnedXp,
    lastStudiedOn: today,
    streak: computeNextStreak(progress.lastStudiedOn, today, progress.streak),
    weeklyKey,
    weeklyCompletions:
      progress.weeklyKey === weeklyKey
        ? progress.weeklyCompletions + (results.length > 0 ? 1 : 0)
        : results.length > 0
          ? 1
          : 0,
    reviewStats,
  }
}

export function isLessonUnlocked(
  lessonId: string,
  lessonOrder: Lesson[],
  completedLessonIds: Set<string>,
) {
  const lessonIndex = lessonOrder.findIndex((lesson) => lesson.id === lessonId)
  if (lessonIndex <= 0) {
    return true
  }

  return completedLessonIds.has(lessonOrder[lessonIndex - 1].id)
}

export function getLevelInfo(xp: number) {
  const level = Math.floor(xp / xpPerLevel) + 1
  const currentLevelFloor = (level - 1) * xpPerLevel
  const progressInLevel = xp - currentLevelFloor

  return {
    level,
    progressInLevel,
    nextLevelXp: xpPerLevel,
    progressPercent: Math.min(100, Math.round((progressInLevel / xpPerLevel) * 100)),
  }
}

function unlockBadges(progress: ProgressState, units: Unit[]) {
  const badgeIds = new Set(progress.badgeIds)

  if (progress.completedLessonIds.length >= 1) {
    badgeIds.add('first-lesson')
  }

  if (progress.streak >= 3) {
    badgeIds.add('streak-3')
  }

  units.forEach((unit) => {
    const completedUnit = unit.lessonIds.every((lessonId) => progress.completedLessonIds.includes(lessonId))
    if (completedUnit) {
      badgeIds.add(unit.badgeId)
    }
  })

  if (units.every((unit) => unit.lessonIds.every((lessonId) => progress.completedLessonIds.includes(lessonId)))) {
    badgeIds.add('mvp-path-complete')
  }

  return {
    ...progress,
    badgeIds: [...badgeIds],
  }
}

function computeNextStreak(lastStudiedOn: string | null, today: string, currentStreak: number) {
  if (!lastStudiedOn) {
    return 1
  }

  const diff = dayDiff(lastStudiedOn, today)
  if (diff <= 0) {
    return Math.max(currentStreak, 1)
  }

  if (diff === 1) {
    return currentStreak + 1
  }

  if (diff === 2) {
    return Math.max(currentStreak, 1)
  }

  return 1
}

function dayDiff(fromKey: string, toKey: string) {
  const from = new Date(`${fromKey}T00:00:00`)
  const to = new Date(`${toKey}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86400000)
}

function getTodayKey(date = new Date()) {
  return formatDateKey(date)
}

function getWeekKey(date = new Date()) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = current.getDay()
  const distanceToMonday = (day + 6) % 7
  current.setDate(current.getDate() - distanceToMonday)
  return formatDateKey(current)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
