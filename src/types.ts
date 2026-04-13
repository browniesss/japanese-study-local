export type ChoiceOption = {
  id: string
  label: string
  isCorrect: boolean
  explanation: string
}

export type ContentStep = {
  id: string
  type: 'content'
  label: string
  title: string
  description: string
  text?: string
  kana?: string
  romaji?: string
  translation?: string
  bullets?: string[]
}

export type ChoiceStep = {
  id: string
  type: 'choice'
  label: string
  title: string
  description: string
  promptText?: string
  teachingNote?: string
  options: ChoiceOption[]
}

export type SpeakingStep = {
  id: string
  type: 'speaking'
  label: string
  title: string
  description: string
  text: string
  romaji?: string
  translation?: string
  hint: string
}

export type ChecklistStep = {
  id: string
  type: 'checklist'
  label: string
  title: string
  description: string
  items: string[]
}

export type Step = ContentStep | ChoiceStep | SpeakingStep | ChecklistStep

export type ReviewItem =
  | {
      id: string
      lessonId: string
      type: 'choice'
      prompt: string
      text: string
      romaji?: string
      translation?: string
      teachingNote?: string
      options: ChoiceOption[]
    }
  | {
      id: string
      lessonId: string
      type: 'speaking'
      prompt: string
      text: string
      romaji?: string
      translation: string
      hint: string
    }

export type Lesson = {
  id: string
  courseId: string
  unitId: string
  title: string
  subtitle: string
  objective: string
  oneLinePrinciple?: string
  contextHint?: string
  canDo: string[]
  keyPoints: string[]
  studyTips?: string[]
  exampleCards?: {
    title: string
    text: string
    romaji?: string
    translation?: string
  }[]
  referenceSections?: {
    title: string
    rows: {
      label: string
      kana: string
      romaji: string
    }[]
  }[]
  minutes: number
  xp: number
  steps: Step[]
  reviewItems: ReviewItem[]
}

export type Unit = {
  id: string
  courseId: string
  phase: string
  title: string
  summary: string
  badgeId: string
  lessonIds: string[]
}

export type Course = {
  id: string
  label: string
  title: string
  summary: string
  audience: string
  lessonCount: number
}

export type CourseContentFile = {
  course: Course
  units: Unit[]
  lessons: Lesson[]
}

export type ContentManifestCourse = Course & {
  file: string
}

export type ContentManifest = {
  version: 1
  generatedAt: string
  lessonCount: number
  unitCount: number
  courses: ContentManifestCourse[]
}

export type ContentBundle = {
  manifest: ContentManifest
  courseCatalog: Course[]
  curriculum: Unit[]
  lessonOrder: Lesson[]
  lessonRecord: Record<string, Lesson>
  reviewPool: ReviewItem[]
}

export type ReviewStat = {
  correct: number
  incorrect: number
  lastReviewedOn: string | null
  lastOutcome: 'correct' | 'incorrect' | null
}

export type ProgressState = {
  completedLessonIds: string[]
  xp: number
  streak: number
  lastStudiedOn: string | null
  badgeIds: string[]
  weeklyGoal: number
  weeklyCompletions: number
  weeklyKey: string
  nickname: string
  selectedCourseId: string
  onboardingComplete: boolean
  learnerProfile: 'starter' | 'returning' | 'fast-track'
  reviewStats: Record<string, ReviewStat>
  speakingStats: {
    attempts: number
    matched: number
    close: number
    needsWork: number
    recent: {
      date: string
      assessment: 'matched' | 'close' | 'needs-work'
    }[]
  }
  settings: {
    showRomaji: boolean
    audioRate: number
  }
}
