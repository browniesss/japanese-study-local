import { useEffect, useMemo, useState } from 'react'
import './index.css'
import { useRef } from 'react'
import { KanaWritingPad } from './components/KanaWritingPad'
import { QuickListenButton } from './components/QuickListenButton'
import { SpeakingPractice } from './components/SpeakingPractice'
import { starterRecordedAudioCount, starterRecordedAudioDirectory } from './data/audioCatalog'
import {
  completeLesson,
  completeReviewSession,
  createInitialProgress,
  getLevelInfo,
  isLessonUnlocked,
  recordSpeakingAssessment,
} from './lib/progress'
import { loadContentBundle } from './lib/content'
import { localProgressStore } from './lib/progressStore'
import {
  detectRemoteProgressApi,
  loadRemoteSession,
  loginRemoteProfile,
  logoutRemoteProfile,
  saveRemoteProgress,
} from './lib/remoteProgress'
import type { ChoiceStep, ContentBundle, Course, Lesson, ProgressState, ReviewItem, Step } from './types'

type View = 'dashboard' | 'path' | 'lesson' | 'review' | 'charts' | 'settings'
type ReviewMode = 'mixed' | 'reading' | 'speaking'
type KanaScript = 'hiragana' | 'katakana'
type KanaCell = { kana: string; romaji: string }
type KanaRow = { label: string; hint: string; cells: KanaCell[] }
type KanaTarget = {
  script: KanaScript
  scriptLabel: string
  rowLabel: string
  kana: string
  romaji: string
}

const navigationItems: { key: View; label: string }[] = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'path', label: '학습 순서' },
  { key: 'lesson', label: '학습' },
  { key: 'review', label: '복습' },
  { key: 'charts', label: '문자표' },
  { key: 'settings', label: '설정' },
]

const kanaCell = (kana: string, romaji: string): KanaCell => ({ kana, romaji })
const emptyKanaCell = kanaCell('', '')

const hiraganaRows: KanaRow[] = [
  { label: '아행', hint: 'a', cells: [kanaCell('あ', 'a'), kanaCell('い', 'i'), kanaCell('う', 'u'), kanaCell('え', 'e'), kanaCell('お', 'o')] },
  { label: '카행', hint: 'ka', cells: [kanaCell('か', 'ka'), kanaCell('き', 'ki'), kanaCell('く', 'ku'), kanaCell('け', 'ke'), kanaCell('こ', 'ko')] },
  { label: '사행', hint: 'sa', cells: [kanaCell('さ', 'sa'), kanaCell('し', 'shi'), kanaCell('す', 'su'), kanaCell('せ', 'se'), kanaCell('そ', 'so')] },
  { label: '타행', hint: 'ta', cells: [kanaCell('た', 'ta'), kanaCell('ち', 'chi'), kanaCell('つ', 'tsu'), kanaCell('て', 'te'), kanaCell('と', 'to')] },
  { label: '나행', hint: 'na', cells: [kanaCell('な', 'na'), kanaCell('に', 'ni'), kanaCell('ぬ', 'nu'), kanaCell('ね', 'ne'), kanaCell('の', 'no')] },
  { label: '하행', hint: 'ha', cells: [kanaCell('は', 'ha'), kanaCell('ひ', 'hi'), kanaCell('ふ', 'fu'), kanaCell('へ', 'he'), kanaCell('ほ', 'ho')] },
  { label: '마행', hint: 'ma', cells: [kanaCell('ま', 'ma'), kanaCell('み', 'mi'), kanaCell('む', 'mu'), kanaCell('め', 'me'), kanaCell('も', 'mo')] },
  { label: '야행', hint: 'ya', cells: [kanaCell('や', 'ya'), emptyKanaCell, kanaCell('ゆ', 'yu'), emptyKanaCell, kanaCell('よ', 'yo')] },
  { label: '라행', hint: 'ra', cells: [kanaCell('ら', 'ra'), kanaCell('り', 'ri'), kanaCell('る', 'ru'), kanaCell('れ', 're'), kanaCell('ろ', 'ro')] },
  { label: '와행', hint: 'wa', cells: [kanaCell('わ', 'wa'), emptyKanaCell, emptyKanaCell, emptyKanaCell, kanaCell('を', 'o')] },
]

const katakanaRows: KanaRow[] = [
  { label: '아행', hint: 'a', cells: [kanaCell('ア', 'a'), kanaCell('イ', 'i'), kanaCell('ウ', 'u'), kanaCell('エ', 'e'), kanaCell('オ', 'o')] },
  { label: '카행', hint: 'ka', cells: [kanaCell('カ', 'ka'), kanaCell('キ', 'ki'), kanaCell('ク', 'ku'), kanaCell('ケ', 'ke'), kanaCell('コ', 'ko')] },
  { label: '사행', hint: 'sa', cells: [kanaCell('サ', 'sa'), kanaCell('シ', 'shi'), kanaCell('ス', 'su'), kanaCell('セ', 'se'), kanaCell('ソ', 'so')] },
  { label: '타행', hint: 'ta', cells: [kanaCell('タ', 'ta'), kanaCell('チ', 'chi'), kanaCell('ツ', 'tsu'), kanaCell('テ', 'te'), kanaCell('ト', 'to')] },
  { label: '나행', hint: 'na', cells: [kanaCell('ナ', 'na'), kanaCell('ニ', 'ni'), kanaCell('ヌ', 'nu'), kanaCell('ネ', 'ne'), kanaCell('ノ', 'no')] },
  { label: '하행', hint: 'ha', cells: [kanaCell('ハ', 'ha'), kanaCell('ヒ', 'hi'), kanaCell('フ', 'fu'), kanaCell('ヘ', 'he'), kanaCell('ホ', 'ho')] },
  { label: '마행', hint: 'ma', cells: [kanaCell('マ', 'ma'), kanaCell('ミ', 'mi'), kanaCell('ム', 'mu'), kanaCell('メ', 'me'), kanaCell('モ', 'mo')] },
  { label: '야행', hint: 'ya', cells: [kanaCell('ヤ', 'ya'), emptyKanaCell, kanaCell('ユ', 'yu'), emptyKanaCell, kanaCell('ヨ', 'yo')] },
  { label: '라행', hint: 'ra', cells: [kanaCell('ラ', 'ra'), kanaCell('リ', 'ri'), kanaCell('ル', 'ru'), kanaCell('レ', 're'), kanaCell('ロ', 'ro')] },
  { label: '와행', hint: 'wa', cells: [kanaCell('ワ', 'wa'), emptyKanaCell, emptyKanaCell, emptyKanaCell, kanaCell('ヲ', 'o')] },
]

const starterSupportLessonCount = 20

function createKanaTarget(script: KanaScript, row: KanaRow, cell: KanaCell): KanaTarget {
  return {
    script,
    scriptLabel: script === 'hiragana' ? '히라가나' : '가타카나',
    rowLabel: row.label,
    kana: cell.kana,
    romaji: cell.romaji,
  }
}

function getFirstKanaTarget(script: KanaScript, rows: KanaRow[]) {
  const row = rows.find((candidate) => candidate.cells.some((cell) => cell.kana)) ?? rows[0]
  const cell = row.cells.find((candidate) => candidate.kana) ?? row.cells[0]
  return createKanaTarget(script, row, cell)
}

function App() {
  const [content, setContent] = useState<ContentBundle | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    loadContentBundle()
      .then((bundle) => {
        if (cancelled) return
        setContent(bundle)
        setContentError(null)
      })
      .catch((error) => {
        if (cancelled) return
        setContentError(error instanceof Error ? error.message : '콘텐츠를 불러오지 못했습니다.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (contentError) {
    return (
      <div className="app-loading-shell">
        <section className="section-card app-loading-card">
          <p className="eyebrow">콘텐츠 불러오기 실패</p>
          <h3>학습 데이터를 가져오지 못했습니다</h3>
          <p>{contentError}</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>
              다시 시도
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="app-loading-shell">
        <section className="section-card app-loading-card">
          <p className="eyebrow">콘텐츠 로딩</p>
          <h3>레슨과 문제 세트를 불러오는 중입니다</h3>
          <p>초기 접속 시에는 정적 콘텐츠 파일을 먼저 받아옵니다.</p>
        </section>
      </div>
    )
  }

  return <StudyApp content={content} />
}

function StudyApp({ content }: { content: ContentBundle }) {
  const { courseCatalog, curriculum, lessonOrder, lessonRecord, reviewPool } = content
  const [progress, setProgress] = useState<ProgressState>(() => sanitizeProgress(localProgressStore.load(), courseCatalog))
  const [view, setView] = useState<View>('dashboard')
  const [selectedLessonId, setSelectedLessonId] = useState<string>(lessonOrder[0]?.id ?? '')
  const [reviewMode, setReviewMode] = useState<ReviewMode>('mixed')
  const [resetArmed, setResetArmed] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [selectedKana, setSelectedKana] = useState<KanaTarget>(() => getFirstKanaTarget('hiragana', hiraganaRows))
  const [syncMode, setSyncMode] = useState<'checking' | 'local' | 'remote'>('checking')
  const [syncReady, setSyncReady] = useState(false)
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncStatus, setSyncStatus] = useState('저장 방식을 확인하는 중입니다.')
  const [remoteAuthenticated, setRemoteAuthenticated] = useState(false)
  const [accountNickname, setAccountNickname] = useState('')
  const saveTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    detectRemoteProgressApi()
      .then(async (available) => {
        if (cancelled) return

        if (!available) {
          setRemoteAuthenticated(false)
          setSyncMode('local')
          setSyncStatus('현재는 이 브라우저에만 저장됩니다.')
          setSyncReady(true)
          return
        }

        setSyncMode('remote')
        setSyncStatus('로그인 상태를 확인하는 중입니다.')

        try {
          const session = await loadRemoteSession()
          if (cancelled) return

          if (!session) {
            setRemoteAuthenticated(false)
            localProgressStore.clear()
            setProgress(createInitialProgress())
            setAccountNickname('')
            setSyncStatus('닉네임을 입력하면 이 브라우저에서 자동 로그인됩니다.')
            setSyncReady(true)
            return
          }

          setRemoteAuthenticated(true)
          setAccountNickname(session.nickname)

          if (session.progress) {
            setProgress(
              sanitizeProgress(
                {
                  ...session.progress,
                  nickname: session.nickname,
                  onboardingComplete: true,
                },
                courseCatalog,
              ),
            )
          } else {
            setProgress({
              ...createInitialProgress(),
              nickname: session.nickname,
            })
          }

          setSyncStatus(`${session.nickname} 닉네임으로 자동 로그인되었습니다.`)
          setSyncReady(true)
        } catch {
          if (cancelled) return
          setRemoteAuthenticated(false)
          setSyncMode('local')
          setSyncStatus('외부 저장소를 읽지 못해 이 브라우저에만 저장합니다.')
          setSyncReady(true)
        }
      })
      .catch(() => {
        if (cancelled) return
        setRemoteAuthenticated(false)
        setSyncMode('local')
        setSyncStatus('현재는 이 브라우저에만 저장됩니다.')
        setSyncReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [courseCatalog])

  useEffect(() => {
    localProgressStore.save(progress)
  }, [progress])

  useEffect(() => {
    if (!syncReady || syncMode !== 'remote' || !remoteAuthenticated || !progress.onboardingComplete) {
      return
    }

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      saveRemoteProgress(progress)
        .then(() => {
          setSyncStatus('외부 저장소와 동기화되었습니다.')
        })
        .catch(() => {
          setSyncStatus('외부 저장에 실패해 현재 브라우저에도 함께 저장하고 있습니다.')
        })
    }, 500)

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [progress, remoteAuthenticated, syncMode, syncReady])

  useEffect(() => {
    setAccountNickname(progress.nickname)
  }, [progress.nickname])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view, selectedLessonId])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalOverscroll = document.body.style.overscrollBehavior
    if (mobileMoreOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'contain'
    }
    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.overscrollBehavior = originalOverscroll
    }
  }, [mobileMoreOpen])

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const completedLessons = useMemo(() => new Set(progress.completedLessonIds), [progress.completedLessonIds])
  const courseCompletionCounts = useMemo(
    () =>
      Object.fromEntries(
        courseCatalog.map((course) => [
          course.id,
          lessonOrder.filter((lesson) => lesson.courseId === course.id && completedLessons.has(lesson.id)).length,
        ]),
      ) as Record<Course['id'], number>,
    [completedLessons, courseCatalog, lessonOrder],
  )
  const courseCheckpointCounts = useMemo(
    () =>
      Object.fromEntries(
        courseCatalog.map((course) => [
          course.id,
          curriculum
            .filter((unit) => unit.courseId === course.id && getUnitTrack(unit) === 'checkpoint')
            .flatMap((unit) => unit.lessonIds)
            .filter((lessonId) => completedLessons.has(lessonId)).length,
        ]),
      ) as Record<Course['id'], number>,
    [completedLessons, courseCatalog, curriculum],
  )
  const courseLocks = getCourseLocks(courseCompletionCounts, courseCheckpointCounts, progress.learnerProfile)
  const selectedCourseId = courseLocks[progress.selectedCourseId as Course['id']] ? 'starter' : progress.selectedCourseId
  const selectedCourse = courseCatalog.find((course) => course.id === selectedCourseId) ?? courseCatalog[0]
  const guidedMode = selectedCourse.id === 'starter' && courseCompletionCounts.starter < 12
  const activeNavigationItems = guidedMode
    ? navigationItems.filter((item) => ['dashboard', 'lesson', 'charts', 'settings'].includes(item.key))
    : navigationItems
  const mobilePrimaryNavigation = guidedMode
    ? activeNavigationItems
    : activeNavigationItems.filter((item) => ['dashboard', 'lesson', 'review'].includes(item.key))
  const mobileSecondaryNavigation = activeNavigationItems.filter(
    (item) => !mobilePrimaryNavigation.some((primary) => primary.key === item.key),
  )
  const courseLessons = lessonOrder.filter((lesson) => lesson.courseId === selectedCourse.id)
  const courseUnits = curriculum.filter((unit) => unit.courseId === selectedCourse.id)
  const courseReviewPool = reviewPool.filter(
    (item) => item.lessonId.startsWith(`${selectedCourse.id}-`) && completedLessons.has(item.lessonId),
  )
  const recommendedLesson =
    courseLessons.find((lesson) => !completedLessons.has(lesson.id) && isLessonUnlocked(lesson.id, courseLessons, completedLessons)) ??
    courseLessons[0] ??
    lessonOrder[0]
  const activeLesson = courseLessons.find((lesson) => lesson.id === selectedLessonId) ?? recommendedLesson
  const starterSupportActive = activeLesson ? shouldForceStarterSupport(activeLesson, progress.learnerProfile, lessonOrder) : false
  const levelInfo = getLevelInfo(progress.xp)
  const reviewItems = courseReviewPool
    .filter((item) => (reviewMode === 'mixed' ? true : item.type === (reviewMode === 'reading' ? 'choice' : 'speaking')))
    .sort((left, right) => getReviewPriority(progress, right) - getReviewPriority(progress, left))
    .slice(0, 8)
  const showDashboardSecondaryActions = !guidedMode && (reviewItems.length > 0 || courseLessons.length > 0)
  const focusUnitId =
    courseUnits.find((unit) => unit.lessonIds.includes(activeLesson?.id ?? ''))?.id ??
    courseUnits.find((unit) => unit.lessonIds.some((lessonId) => !completedLessons.has(lessonId)))?.id ??
    courseUnits[0]?.id
  const focusUnitIndex = Math.max(0, courseUnits.findIndex((unit) => unit.id === focusUnitId))
  const visiblePathUnitIds = new Set(
    courseUnits
      .filter((_, index) => index === focusUnitIndex || index === focusUnitIndex + 1)
      .map((unit) => unit.id),
  )
  const primaryPathUnits = courseUnits.filter((unit) => visiblePathUnitIds.has(unit.id))
  const secondaryPathUnits = courseUnits.filter((unit) => !visiblePathUnitIds.has(unit.id))
  const focusUnit = courseUnits[focusUnitIndex] ?? courseUnits[0]
  const nextUnit = courseUnits[focusUnitIndex + 1]
  const weeklyRemaining = Math.max(progress.weeklyGoal - progress.weeklyCompletions, 0)
  const speakingPracticeCount = progress.speakingStats.attempts
  const speakingRoutineStatus = speakingPracticeCount ? `${speakingPracticeCount}회 완료` : '시작 전'
  const studyWeekLessonCount = Math.max(1, Math.min(weeklyRemaining > 0 ? weeklyRemaining : 1, 3))
  const studyWeekPlan = courseLessons
    .filter((lesson) => !completedLessons.has(lesson.id))
    .slice(0, studyWeekLessonCount)
    .map((lesson, index) => ({
      lesson,
      unit: courseUnits.find((unit) => unit.lessonIds.includes(lesson.id)),
      orderLabel: index === 0 ? '먼저' : index === 1 ? '다음' : '여유 되면',
    }))
  const studyWeekMinutes = studyWeekPlan.reduce((sum, entry) => sum + entry.lesson.minutes, 0)
  const studySpeakingTargets = studyWeekPlan
    .flatMap(({ lesson }) =>
      lesson.steps
        .filter((step): step is Extract<Step, { type: 'speaking' }> => step.type === 'speaking')
        .slice(0, 2)
        .map((step) => ({
          lessonTitle: lesson.title,
          text: step.text,
          hint: step.hint,
        })),
    )
    .slice(0, 4)
  const studyOpsReviewItems = [...courseReviewPool]
    .sort((left, right) => getReviewPriority(progress, right) - getReviewPriority(progress, left))
    .slice(0, 4)

  const selectCourse = (courseId: Course['id']) => {
    if (courseLocks[courseId]) return

    setProgress((current) => ({
      ...current,
      selectedCourseId: courseId,
    }))
    setMobileMoreOpen(false)
    const firstLesson = lessonOrder.find((lesson) => lesson.courseId === courseId)
    if (firstLesson) setSelectedLessonId(firstLesson.id)
  }

  const changeLearnerProfile = (profile: ProgressState['learnerProfile']) => {
    const nextLocks = getCourseLocks(courseCompletionCounts, courseCheckpointCounts, profile)
    const nextCourseId = nextLocks[progress.selectedCourseId as Course['id']] ? 'starter' : (progress.selectedCourseId as Course['id'])
    const firstLesson = lessonOrder.find((lesson) => lesson.courseId === nextCourseId)

    setProgress((current) => ({
      ...current,
      learnerProfile: profile,
      selectedCourseId: nextCourseId,
    }))

    if (firstLesson) {
      setSelectedLessonId(firstLesson.id)
    }
  }

  const speakKanaTarget = (target: KanaTarget) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

    const utterance = new SpeechSynthesisUtterance(target.kana)
    const voice = window.speechSynthesis.getVoices().find((entry) => entry.lang.toLowerCase().startsWith('ja'))

    if (voice) {
      utterance.voice = voice
    }

    utterance.lang = 'ja-JP'
    utterance.rate = 0.9
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const handleKanaSelect = (target: KanaTarget) => {
    setSelectedKana(target)
    speakKanaTarget(target)
  }

  const completeCurrentLesson = () => {
    if (!activeLesson) return
    setProgress((current) => completeLesson(current, activeLesson, curriculum))
    const nextLesson = getNextLessonId(activeLesson.id, courseLessons)
    if (nextLesson) setSelectedLessonId(nextLesson)
  }

  const finishOnboarding = async (profile: ProgressState['learnerProfile'], nickname: string) => {
    const requestedNickname = nickname.trim()
    const safeNickname = syncMode === 'remote' ? requestedNickname : requestedNickname || '스터디 멤버'

    if (syncMode === 'remote' && !safeNickname) {
      setSyncStatus('원격 저장을 쓰려면 닉네임을 먼저 입력해야 합니다.')
      return
    }

    const courseId = profile === 'fast-track' ? 'beginner' : 'starter'
    const firstLesson = lessonOrder.find((lesson) => lesson.courseId === courseId)
    const nextProgress: ProgressState = {
      ...progress,
      onboardingComplete: true,
      learnerProfile: profile,
      nickname: safeNickname,
      selectedCourseId: courseId,
      settings: {
        ...progress.settings,
        showRomaji: profile !== 'fast-track',
      },
    }

    if (syncMode === 'remote') {
      setSyncBusy(true)
      setSyncStatus('닉네임으로 로그인하는 중입니다.')

      try {
        const session = await loginRemoteProfile(safeNickname)
        setRemoteAuthenticated(true)
        setAccountNickname(session.nickname)

        const remoteProgress = session.progress
          ? sanitizeProgress(
              {
                ...nextProgress,
                ...session.progress,
                onboardingComplete: true,
                nickname: session.nickname || safeNickname,
                selectedCourseId: session.progress.selectedCourseId ?? courseId,
                settings: {
                  ...nextProgress.settings,
                  ...session.progress.settings,
                },
              },
              courseCatalog,
            )
          : nextProgress

        setProgress(remoteProgress)
        setSyncStatus(`${session.nickname} 닉네임으로 로그인되었습니다.`)
      } catch {
        setSyncStatus('로그인에 실패했습니다. 닉네임을 확인하고 다시 시도해 주세요.')
        return
      } finally {
        setSyncBusy(false)
      }
    } else {
      setProgress(nextProgress)
    }

    if (firstLesson) setSelectedLessonId(firstLesson.id)
    setView('dashboard')
  }

  const switchRemoteNickname = async () => {
    if (syncMode !== 'remote') {
      return
    }

    const safeNickname = accountNickname.trim()
    if (!safeNickname) {
      setSyncStatus('로그인할 닉네임을 입력해 주세요.')
      return
    }

    setSyncBusy(true)
    setSyncStatus('다른 닉네임으로 로그인하는 중입니다.')

    try {
      const session = await loginRemoteProfile(safeNickname)
      setRemoteAuthenticated(true)
      setAccountNickname(session.nickname)

      const nextProgress = session.progress
        ? sanitizeProgress(
            {
              ...createInitialProgress(),
              ...session.progress,
              nickname: session.nickname,
              onboardingComplete: Boolean(session.progress.onboardingComplete),
            },
            courseCatalog,
          )
        : {
            ...createInitialProgress(),
            nickname: session.nickname,
          }

      setProgress(nextProgress)

      const firstLesson = lessonOrder.find((lesson) => lesson.courseId === nextProgress.selectedCourseId) ?? lessonOrder[0]
      if (firstLesson) {
        setSelectedLessonId(firstLesson.id)
      }

      setView('dashboard')
      setSyncStatus(`${session.nickname} 닉네임으로 전환되었습니다.`)
    } catch {
      setSyncStatus('닉네임 전환에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSyncBusy(false)
    }
  }

  const logoutFromRemote = async () => {
    if (syncMode !== 'remote') {
      return
    }

    setSyncBusy(true)
    setSyncStatus('현재 로그인 세션을 종료하는 중입니다.')

    try {
      await logoutRemoteProfile()
      setRemoteAuthenticated(false)
      localProgressStore.clear()
      setProgress(createInitialProgress())
      setAccountNickname('')
      setSelectedLessonId(lessonOrder[0]?.id ?? '')
      setView('dashboard')
      setSyncStatus('로그아웃되었습니다. 다른 닉네임으로 다시 시작할 수 있습니다.')
    } catch {
      setSyncStatus('로그아웃에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSyncBusy(false)
    }
  }

  if (!syncReady) {
    return (
      <div className="app-loading-shell">
        <section className="section-card app-loading-card">
          <p className="eyebrow">저장소 준비</p>
          <h3>진행도 저장 방식을 확인하는 중입니다</h3>
          <p>{syncStatus}</p>
        </section>
      </div>
    )
  }

  return (
    <div className={`app-shell app-view-${view}`}>
      {!progress.onboardingComplete ? (
        <WelcomeOverlay
          key={`${syncMode}-${progress.nickname || 'guest'}`}
          onFinish={finishOnboarding}
          busy={syncBusy}
          syncStatus={syncStatus}
          nicknameRequired={syncMode === 'remote'}
          initialNickname={progress.nickname}
        />
      ) : null}
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">JP</div>
          <div>
            <p className="eyebrow">Japanese Study</p>
            <h1>사내 일본어 학습</h1>
            <p className="sidebar-copy">설명, 예문, 문제, 말하기를 한 흐름으로 이어서 보여주는 로컬 학습 앱입니다.</p>
          </div>
        </div>
        <div className="nav-list">
          {activeNavigationItems.map((item) => (
            <button key={item.key} type="button" className={navClass(view === item.key)} onClick={() => { setMobileMoreOpen(false); setView(item.key) }}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-panel">
          <p className="panel-label">난이도 선택</p>
          <div className="sidebar-course-grid">
            {courseCatalog.map((course) => {
              const locked = courseLocks[course.id as Course['id']]

              return (
                <button
                  key={course.id}
                  type="button"
                  className={`sidebar-course-button ${course.id === selectedCourse.id ? 'sidebar-course-button-active' : ''} ${locked ? 'sidebar-course-button-locked' : ''}`}
                  onClick={() => {
                    selectCourse(course.id)
                    setMobileMoreOpen(false)
                    setView('dashboard')
                  }}
                  disabled={locked}
                >
                  <strong>{course.label}</strong>
                  <span>{locked ? '체크포인트를 더 완료하면 열립니다' : course.title}</span>
                </button>
              )
            })}
          </div>
        </div>
        {!guidedMode ? (
          <>
            <div className="sidebar-panel">
              <p className="panel-label">현재 코스</p>
              <strong>{selectedCourse.title}</strong>
              <span>{selectedCourse.summary}</span>
            </div>
            <div className="sidebar-panel">
              <p className="panel-label">오늘 포커스</p>
              <strong>{recommendedLesson?.title}</strong>
              <span>{recommendedLesson?.subtitle}</span>
              <span>오늘은 이 학습부터 이어서 보면 됩니다.</span>
            </div>
          </>
        ) : null}
      </aside>
      <main className="main-pane">
        <header className={`topbar ${view === 'lesson' ? 'topbar-compact' : ''}`}>
          <div className="topbar-title-row">
            <div className="topbar-title-copy">
              <p className="eyebrow">{selectedCourse.label}</p>
              <h2>{getPageTitle(view, activeLesson?.title)}</h2>
              {view !== 'lesson' ? <p className="muted-copy">{getPageDescription(view, selectedCourse.title, activeLesson?.subtitle)}</p> : null}
            </div>
            {view !== 'dashboard' ? (
              <button
                type="button"
                className="mobile-home-button mobile-only"
                aria-label="홈으로 이동"
                onClick={() => {
                  setMobileMoreOpen(false)
                  setView('dashboard')
                }}
              >
                홈
              </button>
            ) : null}
          </div>
          {view !== 'dashboard' && view !== 'lesson' ? (
            <div className="topbar-metrics">
              <MetricChip label="현재 레벨" value={`Lv.${levelInfo.level}`} helper={`${levelInfo.progressPercent}% 진행`} />
              <MetricChip label="연속 학습" value={`${progress.streak}일`} helper="짧아도 매일" />
              <MetricChip label="이번 주" value={`${progress.weeklyCompletions}/${progress.weeklyGoal}`} helper="주간 목표" />
            </div>
          ) : null}
        </header>
        {view === 'dashboard' ? (
          <div className="stack-lg">
            <section className="hero-card hero-card-guided">
              <div className="hero-copy">
                <p className="eyebrow">오늘 할 1개</p>
                <h3>{progress.nickname ? `${progress.nickname}님, ` : ''}{recommendedLesson?.title ?? '다음 학습'}</h3>
                <p className="desktop-only">{guidedMode ? '오늘은 이 학습 하나만 시작하면 됩니다. 설명을 보고, 소리 내어 읽고, 완료 버튼만 누르면 됩니다.' : '지금은 이 학습만 끝내면 됩니다. 나머지 구조와 복습은 필요할 때만 보면 됩니다.'}</p>
                <p className="mobile-only">{guidedMode ? '이 학습 하나만 시작하면 됩니다.' : '지금은 이 학습부터 이어서 보면 됩니다.'}</p>
                <div className="hero-actions">
                  <button className="primary-button primary-cta" type="button" onClick={() => { setMobileMoreOpen(false); if (recommendedLesson) setSelectedLessonId(recommendedLesson.id); setView('lesson') }}>
                    {guidedMode ? '첫 학습 시작하기' : '이어서 학습하기'}
                  </button>
                </div>
                <div className="dashboard-reward-strip desktop-only">
                  <div className="reward-chip">
                    <span>현재 레벨</span>
                    <strong>Lv.{levelInfo.level}</strong>
                  </div>
                  <div className="reward-chip">
                    <span>연속 학습</span>
                    <strong>{progress.streak}일</strong>
                  </div>
                  <div className="reward-chip">
                    <span>이번 주</span>
                    <strong>{progress.weeklyCompletions}/{progress.weeklyGoal}</strong>
                  </div>
                </div>
                <div className="mobile-only mobile-dashboard-summary">
                  <div className="mobile-summary-chip">
                    <span>레벨</span>
                    <strong>Lv.{levelInfo.level}</strong>
                  </div>
                  <div className="mobile-summary-chip">
                    <span>이번 주</span>
                    <strong>{progress.weeklyCompletions}/{progress.weeklyGoal}</strong>
                  </div>
                  <div className="mobile-summary-chip">
                    <span>완료</span>
                    <strong>{courseCompletionCounts[selectedCourse.id]}개</strong>
                  </div>
                </div>
                <div className="reward-progress">
                  <div className="reward-progress-copy">
                    <strong>다음 레벨 진행</strong>
                    <span>{levelInfo.progressInLevel} / {levelInfo.nextLevelXp} XP</span>
                  </div>
                  <div className="progress-bar"><div style={{ width: `${levelInfo.progressPercent}%` }} /></div>
                </div>
                <div className="review-stage-meta desktop-only">
                  <span className="section-hint">지금까지 {courseCompletionCounts[selectedCourse.id]}개 완료</span>
                </div>
              </div>
              <div className="hero-panel dashboard-side-panel desktop-only">
                <div className="dashboard-panel-section">
                  <p className="eyebrow">오늘 루틴</p>
                  <div className="dashboard-task-list">
                    <div className="dashboard-task-item">
                      <strong>1. {recommendedLesson?.title ?? '다음 학습 시작'}</strong>
                      <span>{recommendedLesson?.subtitle ?? '지금 이어서 시작할 수 있는 학습입니다.'}</span>
                    </div>
                    <div className="dashboard-task-item">
                      <strong>2. {reviewItems.length ? `짧은 복습 ${Math.min(reviewItems.length, 3)}문제` : '복습은 아직 많지 않습니다'}</strong>
                      <span>{reviewItems.length ? '틀렸던 항목과 오래 안 본 항목부터 다시 봅니다.' : '완료한 학습이 조금 더 쌓이면 여기서 자동으로 다시 보게 됩니다.'}</span>
                    </div>
                    <div className="dashboard-task-item">
                      <strong>3. 소리 내어 한 번 읽기</strong>
                      <span>말하기 단계에서 샘플을 듣고 그대로 따라 읽으면 바로 마무리됩니다.</span>
                    </div>
                  </div>
                </div>
                <div className="dashboard-panel-grid">
                  <div className="review-focus-chip">
                    <span>현재 학습 묶음</span>
                    <strong>{focusUnit?.title ?? selectedCourse.title}</strong>
                  </div>
                  <div className="review-focus-chip">
                    <span>다음 포인트</span>
                    <strong>{nextUnit?.title ?? (weeklyRemaining > 0 ? `이번 주 ${weeklyRemaining}개 남음` : '이번 주 목표 달성')}</strong>
                  </div>
                  <div className="review-focus-chip">
                    <span>말하기 루틴</span>
                    <strong>{speakingRoutineStatus}</strong>
                  </div>
                  <div className="review-focus-chip">
                    <span>복습 준비</span>
                    <strong>{reviewItems.length ? `${reviewItems.length}개 대기` : '아직 여유 있음'}</strong>
                  </div>
                </div>
              </div>
            </section>
            <details className="section-card mobile-only mobile-fold-card">
              <summary className="collapsible-summary">
                <div>
                  <p className="eyebrow">오늘 루틴</p>
                  <h3>오늘 흐름 보기</h3>
                </div>
                <span className="section-hint">{reviewItems.length ? `${Math.min(reviewItems.length, 3)}개 복습` : '학습 중심'}</span>
              </summary>
              <div className="collapsible-stack">
                <div className="dashboard-task-list">
                  <div className="dashboard-task-item">
                    <strong>1. {recommendedLesson?.title ?? '다음 학습 시작'}</strong>
                    <span>{recommendedLesson?.subtitle ?? '지금 이어서 시작할 수 있는 학습입니다.'}</span>
                  </div>
                  <div className="dashboard-task-item">
                    <strong>2. {reviewItems.length ? `짧은 복습 ${Math.min(reviewItems.length, 3)}문제` : '복습은 아직 많지 않습니다'}</strong>
                    <span>{reviewItems.length ? '틀렸던 항목과 오래 안 본 항목부터 다시 봅니다.' : '완료한 학습이 조금 더 쌓이면 여기서 자동으로 다시 보게 됩니다.'}</span>
                  </div>
                  <div className="dashboard-task-item">
                    <strong>3. 소리 내어 한 번 읽기</strong>
                    <span>말하기 단계에서 샘플을 듣고 그대로 따라 읽으면 바로 마무리됩니다.</span>
                  </div>
                </div>
              </div>
            </details>
            {showDashboardSecondaryActions ? (
              <section className="section-card desktop-only">
                <div className="section-header">
                  <div>
                    <p className="eyebrow">다음에 많이 쓰는 화면</p>
                    <h3>지금은 학습만 시작하고, 나머지는 필요할 때만 봅니다</h3>
                  </div>
                  <span className="section-hint">보조 동선</span>
                </div>
                <div className="session-grid">
                  <button className="quick-session-card" type="button" onClick={() => setView('path')}>
                    <strong>학습 경로 보기</strong>
                    <p>코스 구조와 수료 기준을 한 번에 확인합니다.</p>
                  </button>
                  {reviewItems.length ? (
                    <button className="quick-session-card" type="button" onClick={() => setView('review')}>
                      <strong>짧은 복습 열기</strong>
                      <p>틀렸던 항목과 오래 보지 않은 항목부터 다시 봅니다.</p>
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}
            {showDashboardSecondaryActions ? (
              <details className="section-card mobile-only mobile-fold-card">
                <summary className="collapsible-summary">
                  <div>
                    <p className="eyebrow">바로 가기</p>
                    <h3>보조 화면</h3>
                  </div>
                  <span className="section-hint">보조 동선</span>
                </summary>
                <div className="collapsible-stack">
                  <div className="session-grid">
                    <button className="quick-session-card" type="button" onClick={() => { setMobileMoreOpen(false); setView('path') }}>
                      <strong>학습 경로 보기</strong>
                      <p>코스 구조와 수료 기준을 한 번에 확인합니다.</p>
                    </button>
                    {reviewItems.length ? (
                      <button className="quick-session-card" type="button" onClick={() => { setMobileMoreOpen(false); setView('review') }}>
                        <strong>짧은 복습 열기</strong>
                        <p>틀렸던 항목과 오래 보지 않은 항목부터 다시 봅니다.</p>
                      </button>
                    ) : null}
                  </div>
                </div>
              </details>
            ) : null}
            <section className="section-card desktop-only">
              <div className="section-header">
                <div>
                  <p className="eyebrow">스터디 준비 메모</p>
                  <h3>현재 기기 진도를 기준으로 이번 주 학습 준비를 정리했습니다</h3>
                </div>
                <span className="section-hint">공용 데이터 없이 로컬 진도로 생성</span>
              </div>
              <div className="study-ops-grid">
                <div className="study-ops-card">
                  <div className="study-ops-head">
                    <strong>이번 주 추천 진행</strong>
                    <span>{studyWeekPlan.length ? `${studyWeekPlan.length}개 · 약 ${studyWeekMinutes}분` : '새 학습 없음'}</span>
                  </div>
                  {studyWeekPlan.length ? (
                    <div className="study-ops-list">
                      {studyWeekPlan.map(({ lesson, unit, orderLabel }) => (
                        <div key={lesson.id} className="study-ops-item">
                          <div>
                            <p>{orderLabel}</p>
                            <strong>{lesson.title}</strong>
                            <span>{lesson.subtitle}</span>
                          </div>
                          <div className="study-ops-meta">
                            <span>{unit ? getUnitTrackLabel(getUnitTrack(unit)) : '학습'}</span>
                            <span>{lesson.minutes}분</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">현재 코스의 학습을 모두 마쳤습니다. 복습과 따라 읽기 루틴만 유지하면 됩니다.</p>
                  )}
                </div>
                <div className="study-ops-card">
                    <div className="study-ops-head">
                    <strong>이번 주 따라 읽기 목표</strong>
                    <span>{studySpeakingTargets.length ? `${studySpeakingTargets.length}문장` : '준비 중'}</span>
                  </div>
                  {studySpeakingTargets.length ? (
                    <div className="study-ops-list">
                      {studySpeakingTargets.map((target) => (
                        <div key={`${target.lessonTitle}-${target.text}`} className="study-ops-item study-ops-item-speaking">
                          <div>
                            <p>{target.lessonTitle}</p>
                            <strong className="jp-copy">{target.text}</strong>
                            <span>{target.hint}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">이번 주 추천 진행에 포함된 레슨에서 바로 꺼내 쓸 따라 읽기 목표가 아직 많지 않습니다.</p>
                  )}
                </div>
                <div className="study-ops-card">
                  <div className="study-ops-head">
                    <strong>복습 우선 목록</strong>
                    <span>{studyOpsReviewItems.length ? `${studyOpsReviewItems.length}개` : '쌓이는 중'}</span>
                  </div>
                  {studyOpsReviewItems.length ? (
                    <div className="study-ops-list">
                      {studyOpsReviewItems.map((item) => (
                        <div key={item.id} className="study-ops-item">
                          <div>
                            <p>{lessonRecord[item.lessonId]?.title ?? '복습'}</p>
                            <strong>{getReviewItemSummary(item)}</strong>
                            <span>{getReviewReason(progress, item)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">아직 복습 우선 항목이 많지 않습니다. 학습을 이어가면 자동으로 정리됩니다.</p>
                  )}
                </div>
              </div>
            </section>
            <details className="section-card mobile-only mobile-fold-card">
              <summary className="collapsible-summary">
                <div>
                  <p className="eyebrow">학습 준비</p>
                  <h3>이번 주 메모 보기</h3>
                </div>
                <span className="section-hint">{studyWeekPlan.length ? `${studyWeekPlan.length}개 추천` : '정리 완료'}</span>
              </summary>
              <div className="collapsible-stack mobile-study-ops-stack">
                <div className="study-ops-card">
                  <div className="study-ops-head">
                    <strong>이번 주 추천 진행</strong>
                    <span>{studyWeekPlan.length ? `${studyWeekPlan.length}개 · 약 ${studyWeekMinutes}분` : '새 학습 없음'}</span>
                  </div>
                  {studyWeekPlan.length ? (
                    <div className="study-ops-list">
                      {studyWeekPlan.map(({ lesson, unit, orderLabel }) => (
                        <div key={lesson.id} className="study-ops-item">
                          <div>
                            <p>{orderLabel}</p>
                            <strong>{lesson.title}</strong>
                            <span>{lesson.subtitle}</span>
                          </div>
                          <div className="study-ops-meta">
                            <span>{unit ? getUnitTrackLabel(getUnitTrack(unit)) : '학습'}</span>
                            <span>{lesson.minutes}분</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">현재 코스의 학습을 모두 마쳤습니다.</p>
                  )}
                </div>
                <div className="study-ops-card">
                  <div className="study-ops-head">
                    <strong>이번 주 따라 읽기 목표</strong>
                    <span>{studySpeakingTargets.length ? `${studySpeakingTargets.length}문장` : '준비 중'}</span>
                  </div>
                  {studySpeakingTargets.length ? (
                    <div className="study-ops-list">
                      {studySpeakingTargets.map((target) => (
                        <div key={`${target.lessonTitle}-${target.text}`} className="study-ops-item study-ops-item-speaking">
                          <div>
                            <p>{target.lessonTitle}</p>
                            <strong className="jp-copy">{target.text}</strong>
                            <span>{target.hint}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">이번 주 추천 진행에 맞는 따라 읽기 목표가 아직 많지 않습니다.</p>
                  )}
                </div>
                <div className="study-ops-card">
                  <div className="study-ops-head">
                    <strong>복습 우선 목록</strong>
                    <span>{studyOpsReviewItems.length ? `${studyOpsReviewItems.length}개` : '쌓이는 중'}</span>
                  </div>
                  {studyOpsReviewItems.length ? (
                    <div className="study-ops-list">
                      {studyOpsReviewItems.map((item) => (
                        <div key={item.id} className="study-ops-item">
                          <div>
                            <p>{lessonRecord[item.lessonId]?.title ?? '복습'}</p>
                            <strong>{getReviewItemSummary(item)}</strong>
                            <span>{getReviewReason(progress, item)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-copy">아직 복습 우선 항목이 많지 않습니다.</p>
                  )}
                </div>
              </div>
            </details>
          </div>
        ) : null}

        {view === 'path' ? (
          <div className="stack-lg">
            <section className="lesson-hero">
              <div className="hero-copy">
                <p className="eyebrow">학습 순서</p>
                <h3>{selectedCourse.title}</h3>
              </div>
              <div className="lesson-progress-card">
                <span>전체 진행도</span>
                <strong>{courseCompletionCounts[selectedCourse.id]}개 완료</strong>
                <div className="progress-bar"><div style={{ width: `${Math.round((courseCompletionCounts[selectedCourse.id] / Math.max(courseLessons.length, 1)) * 100)}%` }} /></div>
                <span>지금은 진행 중인 묶음만 먼저 펼쳐집니다</span>
              </div>
            </section>
            <div className="stack-md">
              {primaryPathUnits.map((unit) => (
                <details key={unit.id} className="collapsible-card" open={unit.id === focusUnitId}>
                  <summary className="collapsible-summary">
                    <div>
                      <p className="eyebrow">{unit.phase}</p>
                      <h3>{unit.title}</h3>
                    </div>
                    <span className={`unit-badge unit-badge-${getUnitTrack(unit)}`}>{unit.lessonIds.filter((lessonId) => completedLessons.has(lessonId)).length} / {unit.lessonIds.length}</span>
                  </summary>
                  <div className="collapsible-stack">
                    <p className="muted-copy">{unit.summary}</p>
                    <div className="lesson-list">
                      {unit.lessonIds.map((lessonId) => {
                        const lesson = lessonRecord[lessonId]
                        const unlocked = isLessonUnlocked(lesson.id, courseLessons, completedLessons)
                        const completed = completedLessons.has(lesson.id)
                        const track = getUnitTrack(unit)
                        return (
                          <button
                            key={lesson.id}
                            type="button"
                            className={lessonButtonClass(lesson.id === activeLesson?.id, completed, !unlocked)}
                            onClick={() => { setMobileMoreOpen(false); setSelectedLessonId(lesson.id); setView('lesson') }}
                            disabled={!unlocked}
                          >
                            <span>
                              <strong>{lesson.title}</strong>
                              <small>{getUnitTrackLabel(track)} · {lesson.subtitle}</small>
                            </span>
                            <span className={completed ? 'status-done' : unlocked ? 'status-open' : 'section-hint'}>{completed ? '완료' : unlocked ? '진행 가능' : '아직 잠겨 있음'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </details>
              ))}
              {secondaryPathUnits.length ? (
                <details className="collapsible-card">
                  <summary className="collapsible-summary"><div><p className="eyebrow">나머지 묶음</p><h3>이후 학습 순서 보기</h3></div><span className="section-hint">{secondaryPathUnits.length}개</span></summary>
                  <div className="collapsible-stack">
                    {secondaryPathUnits.map((unit) => (
                      <div key={unit.id} className="section-card lesson-support-card">
                        <div className="section-header">
                          <div>
                            <p className="eyebrow">{unit.phase}</p>
                            <h3>{unit.title}</h3>
                            <p>{unit.summary}</p>
                          </div>
                          <span className={`unit-badge unit-badge-${getUnitTrack(unit)}`}>{unit.lessonIds.filter((lessonId) => completedLessons.has(lessonId)).length} / {unit.lessonIds.length}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        ) : null}

        {view === 'lesson' && activeLesson ? (
          <LessonPanel
            key={activeLesson.id}
            lesson={activeLesson}
            showRomaji={progress.settings.showRomaji}
            audioRate={progress.settings.audioRate}
            onToggleRomaji={(value) => setProgress((current) => ({ ...current, settings: { ...current.settings, showRomaji: value } }))}
            onCompleteLesson={completeCurrentLesson}
            onOpenNext={() => { const nextLesson = getNextLessonId(activeLesson.id, courseLessons); if (nextLesson) setSelectedLessonId(nextLesson) }}
            onSpeakingAssessment={(assessment) => setProgress((current) => recordSpeakingAssessment(current, assessment))}
            onNavigate={(nextView) => {
              setMobileMoreOpen(false)
              setView(nextView)
            }}
            guidedMode={guidedMode}
            starterSupportActive={starterSupportActive}
          />
        ) : null}
        {view === 'review' ? (
          <ReviewPanel
            key={`${selectedCourse.id}-${reviewMode}-${reviewItems.map((item) => item.id).join(',')}`}
            mode={reviewMode}
            items={reviewItems}
            audioRate={progress.settings.audioRate}
            onChangeMode={setReviewMode}
            onCompleteSession={(results) => setProgress((current) => completeReviewSession(current, results))}
            onSpeakingAssessment={(assessment) => setProgress((current) => recordSpeakingAssessment(current, assessment))}
          />
        ) : null}

        {view === 'charts' ? (
          <div className="stack-lg">
            <section className="section-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">문자표</p>
                  <h3>히라가나와 가타카나 전체표</h3>
                  <p>문자표의 글자를 누르면 바로 소리가 나고, 아래 쓰기 패드에서 같은 글자를 직접 따라 써볼 수 있습니다.</p>
                </div>
                <span className="section-hint">탭하면 소리 재생 · PC는 마우스 · 모바일은 터치</span>
              </div>
            </section>
            <KanaWorkbench target={selectedKana} onReplay={() => speakKanaTarget(selectedKana)} />
            <KanaSection
              title="히라가나"
              script="hiragana"
              rows={hiraganaRows}
              activeKana={selectedKana.kana}
              onSelectKana={handleKanaSelect}
            />
            <KanaSection
              title="가타카나"
              script="katakana"
              rows={katakanaRows}
              activeKana={selectedKana.kana}
              onSelectKana={handleKanaSelect}
            />
          </div>
        ) : null}

        {view === 'settings' ? (
          <div className="stack-lg">
            <section className="section-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">학습자 모드</p>
                  <h3>입문자 여부와 관계없이 여기서 바꿉니다</h3>
                </div>
                <span className="section-hint">{progress.learnerProfile === 'starter' ? '체크포인트 기반 잠금' : '모든 코스 즉시 전환 가능'}</span>
              </div>
              <div className="course-grid profile-mode-grid">
                <ProfileCard title="입문자" description="히라가나부터 천천히, 체크포인트 기준으로 다음 코스 해제" active={progress.learnerProfile === 'starter'} onClick={() => changeLearnerProfile('starter')} />
                <ProfileCard title="다시 시작" description="기본부터 다시 보되 코스는 자유롭게 이동" active={progress.learnerProfile === 'returning'} onClick={() => changeLearnerProfile('returning')} />
                <ProfileCard title="빠른 진도" description="숙련자 포함, 모든 코스를 바로 이동" active={progress.learnerProfile === 'fast-track'} onClick={() => changeLearnerProfile('fast-track')} />
              </div>
              <p className="muted-copy">
                {progress.learnerProfile === 'starter'
                  ? '입문자 모드에서는 체크포인트를 완료해야 다음 코스가 열립니다.'
                  : '현재 모드에서는 숙련자도 설정 화면에서 원하는 코스로 바로 바꿀 수 있습니다.'}
              </p>
            </section>
            <section className="section-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">학습 계정</p>
                  <h3>닉네임으로 이어서 공부합니다</h3>
                </div>
                <span className="section-hint">{syncMode === 'remote' ? '세션 로그인 사용 중' : '로컬 저장만 사용 중'}</span>
              </div>
              <div className="settings-grid">
                <div className="info-pill">
                  <strong>현재 상태</strong>
                  <p>{syncMode === 'remote' ? (remoteAuthenticated ? `${progress.nickname || '스터디 멤버'} 닉네임으로 로그인됨` : '아직 로그인하지 않았습니다.') : '현재는 이 브라우저에만 저장됩니다.'}</p>
                  <p>{syncStatus}</p>
                </div>
                {syncMode === 'remote' ? (
                  <div className="info-pill">
                    <strong>다른 닉네임으로 전환</strong>
                    <p>같은 닉네임으로 들어가면 기존 학습 기록을 그대로 이어받습니다.</p>
                    <div className="stack-md">
                      <input
                        className="text-input"
                        value={accountNickname}
                        onChange={(event) => setAccountNickname(event.target.value)}
                        placeholder="예: 민수"
                      />
                      <div className="inline-actions">
                        <button className="primary-button" type="button" onClick={() => void switchRemoteNickname()} disabled={syncBusy}>
                          {syncBusy ? '처리 중...' : '이 닉네임으로 로그인'}
                        </button>
                        <button className="ghost-button" type="button" onClick={() => void logoutFromRemote()} disabled={syncBusy || !remoteAuthenticated}>
                          로그아웃
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="info-pill">
                    <strong>원격 저장 안내</strong>
                    <p>Vercel 환경 변수에 `DATABASE_URL`을 넣고 재배포하면 닉네임 기반 로그인과 기기 간 동기화가 켜집니다.</p>
                  </div>
                )}
              </div>
            </section>
            <section className="section-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">학습 설정</p>
                  <h3>보기와 백업 설정</h3>
                </div>
              </div>
              <div className="settings-grid">
                <div className="info-pill">
                  <strong>로마자 표시</strong>
                  <p>입문자 초반 20개 레슨은 로마자를 함께 보여주고, 이후부터는 이 설정을 따릅니다.</p>
                  <label className="toggle-row">
                    <input type="checkbox" checked={progress.settings.showRomaji} onChange={(event) => setProgress((current) => ({ ...current, settings: { ...current.settings, showRomaji: event.target.checked } }))} />
                    <span>로마자 보기</span>
                  </label>
                </div>
                <div className="info-pill">
                  <strong>샘플 음성 속도</strong>
                  <p>{progress.settings.audioRate.toFixed(2)}x</p>
                  <input type="range" min="0.7" max="1.1" step="0.05" value={progress.settings.audioRate} onChange={(event) => setProgress((current) => ({ ...current, settings: { ...current.settings, audioRate: Number(event.target.value) } }))} />
                </div>
                <div className="info-pill">
                  <strong>고정 음원 우선 구간</strong>
                  <p>입문 코어 {starterRecordedAudioCount}개 레슨은 {starterRecordedAudioDirectory} 경로의 음원을 먼저 찾고, 없으면 브라우저 음성으로 진행합니다.</p>
                </div>
              </div>
            </section>
            <details className="collapsible-card">
              <summary className="collapsible-summary"><div><p className="eyebrow">학습 코스</p><h3>필요할 때만 바꿉니다</h3></div><span className="section-hint">고급 설정</span></summary>
              <div className="collapsible-stack">
                <p className="muted-copy">잠금된 코스는 체크포인트를 더 완료하면 열립니다.</p>
                <div className="course-grid">
                  {courseCatalog.map((course) => (
                    <button
                      key={course.id}
                      type="button"
                      className={`course-card ${course.id === selectedCourse.id ? 'course-card-active' : ''} ${courseLocks[course.id as Course['id']] ? 'course-card-locked' : ''}`}
                      onClick={() => selectCourse(course.id)}
                      disabled={courseLocks[course.id as Course['id']]}
                    >
                      <span className="course-label">{course.label}</span>
                      <strong>{course.title}</strong>
                      <p>{course.summary}</p>
                      <small>완료 {courseCompletionCounts[course.id]}개 · 확인 {courseCheckpointCounts[course.id]}개{courseLocks[course.id as Course['id']] ? ' · 잠금' : ''}</small>
                    </button>
                  ))}
                </div>
              </div>
            </details>
            <section className="section-card">
              <div className="section-header">
                <div>
                  <p className="eyebrow">학습 기록</p>
                  <h3>내보내기와 가져오기</h3>
                </div>
              </div>
              <div className="support-actions">
                <div className="support-note">
                  <strong>저장 위치</strong>
                  <p>{syncMode === 'remote' ? '닉네임 세션으로 로그인되어 외부 저장소와 동기화됩니다.' : '현재 브라우저에만 저장됩니다.'}</p>
                  <p>{syncStatus}</p>
                </div>
                <div className="support-note">
                  <strong>진도 내보내기</strong>
                  <p>현재 기기의 진도를 JSON 파일로 저장합니다.</p>
                  <button className="ghost-button" type="button" onClick={() => exportProgress(progress)}>내보내기</button>
                </div>
                <ImportCard onImport={(next) => setProgress(sanitizeProgress(next, courseCatalog))} />
                <div className="support-note">
                  <strong>처음부터 다시</strong>
                  <p>{resetArmed ? '이 작업은 현재 기기의 진도, streak, XP를 모두 지웁니다.' : '현재 기기에 저장된 진행 상태를 초기화합니다.'}</p>
                  {!resetArmed ? (
                    <button className="danger-button" type="button" onClick={() => setResetArmed(true)}>초기화 준비</button>
                  ) : (
                    <div className="inline-actions">
                      <button className="ghost-button" type="button" onClick={() => setResetArmed(false)}>취소</button>
                      <button
                        className="danger-button"
                        type="button"
                        onClick={() => {
                          const resetProgress = {
                            ...createInitialProgress(),
                            nickname: progress.nickname,
                          }

                          localProgressStore.clear()
                          setProgress(resetProgress)

                          if (syncMode === 'remote' && remoteAuthenticated) {
                            void saveRemoteProgress(resetProgress)
                              .then(() => {
                                setSyncStatus('외부 저장소의 진행도도 초기화했습니다.')
                              })
                              .catch(() => {
                                setSyncStatus('원격 초기화에 실패해 현재 브라우저에서만 먼저 초기화했습니다.')
                              })
                          }

                          setSelectedLessonId(lessonOrder[0]?.id ?? '')
                          setResetArmed(false)
                          setMobileMoreOpen(false)
                          setView('dashboard')
                        }}
                      >
                        정말 초기화합니다
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
      <nav className={`bottom-nav bottom-nav-count-${mobilePrimaryNavigation.length + (mobileSecondaryNavigation.length ? 1 : 0)} ${view === 'lesson' ? 'bottom-nav-hidden' : ''}`} aria-label="모바일 탐색">
        {mobilePrimaryNavigation.map((item) => (
          <button key={item.key} type="button" className={navClass(view === item.key)} onClick={() => { setMobileMoreOpen(false); setView(item.key) }}>
            {item.label}
          </button>
        ))}
        {mobileSecondaryNavigation.length ? (
          <button
            type="button"
            className={navClass(mobileMoreOpen || mobileSecondaryNavigation.some((item) => item.key === view))}
            onClick={() => setMobileMoreOpen((current) => !current)}
          >
            더보기
          </button>
        ) : null}
      </nav>
      {mobileSecondaryNavigation.length && view !== 'lesson' ? (
        <>
          <button
            type="button"
            aria-label="모바일 더보기 닫기"
            className={`mobile-more-backdrop ${mobileMoreOpen ? 'mobile-more-backdrop-open' : ''}`}
            onClick={() => setMobileMoreOpen(false)}
          />
          <div className={`mobile-more-sheet ${mobileMoreOpen ? 'mobile-more-sheet-open' : ''}`}>
            <div className="mobile-more-sheet-head">
              <strong>더보기</strong>
              <button type="button" className="ghost-button" onClick={() => setMobileMoreOpen(false)}>닫기</button>
            </div>
            <div className="mobile-more-grid">
              {mobileSecondaryNavigation.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`quick-session-card ${view === item.key ? 'mode-card-active' : ''}`}
                  onClick={() => {
                    setView(item.key)
                    setMobileMoreOpen(false)
                  }}
                >
                  <strong>{item.label}</strong>
                  <p>{getMobileMoreDescription(item.key)}</p>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function LessonPanel({
  lesson,
  showRomaji,
  audioRate,
  onToggleRomaji,
  onCompleteLesson,
  onOpenNext,
  onSpeakingAssessment,
  onNavigate,
  guidedMode,
  starterSupportActive,
}: {
  lesson: Lesson
  showRomaji: boolean
  audioRate: number
  onToggleRomaji: (value: boolean) => void
  onCompleteLesson: () => void
  onOpenNext: () => void
  onSpeakingAssessment: (assessment: 'matched' | 'close' | 'needs-work') => void
  onNavigate: (view: View) => void
  guidedMode: boolean
  starterSupportActive: boolean
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([])
  const [mobileLessonInfoOpen, setMobileLessonInfoOpen] = useState(false)
  const effectiveShowRomaji = showRomaji || starterSupportActive
  const currentStep = lesson.steps[stepIndex]
  const currentDone = completedStepIds.includes(currentStep.id)
  const allDone = lesson.steps.every((step) => completedStepIds.includes(step.id))
  const isLastStep = stepIndex === lesson.steps.length - 1
  const isInlineCompletableStep = currentStep.type === 'content' || currentStep.type === 'checklist'

  const markStepComplete = (stepId: string) => {
    setCompletedStepIds((current) => (current.includes(stepId) ? current : [...current, stepId]))
  }

  const goToPreviousStep = () => {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  const goToNextStep = () => {
    setStepIndex((current) => Math.min(current + 1, lesson.steps.length - 1))
  }

  const handleMobilePrimaryAction = () => {
    if (allDone) {
      onCompleteLesson()
      return
    }

    if (!currentDone) {
      if (!isInlineCompletableStep) return
      markStepComplete(currentStep.id)
      if (!isLastStep) {
        window.setTimeout(() => {
          setStepIndex((current) => Math.min(current + 1, lesson.steps.length - 1))
        }, 120)
      }
      return
    }

    if (!isLastStep) {
      goToNextStep()
    }
  }

  const mobilePrimaryLabel = allDone
    ? '학습 완료하기'
    : currentDone
      ? '다음 단계로'
      : currentStep.type === 'content'
        ? (isLastStep ? '읽기 완료' : '읽기 완료하고 다음으로')
          : currentStep.type === 'checklist'
            ? (isLastStep ? '체크 완료' : '체크 완료하고 다음으로')
            : currentStep.type === 'choice'
              ? '정답을 고르면 다음으로'
              : '샘플 듣고 읽으면 다음으로'

  const mobilePrimaryDisabled = !allDone && !currentDone && !isInlineCompletableStep

  useEffect(() => {
    const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
    if (isPhone) {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [stepIndex, lesson.id])

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalOverscroll = document.body.style.overscrollBehavior

    if (mobileLessonInfoOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.overscrollBehavior = 'contain'
    }

    return () => {
      document.body.style.overflow = originalOverflow
      document.body.style.overscrollBehavior = originalOverscroll
    }
  }, [mobileLessonInfoOpen])

  return (
    <div className="stack-lg">
      <section className="section-card mobile-only mobile-lesson-focus-head">
        <div className="mobile-lesson-focus-copy">
          <p className="eyebrow">현재 학습</p>
          <h3>{lesson.title}</h3>
          <span className="section-hint">{stepIndex + 1} / {lesson.steps.length} 단계 · {lesson.minutes}분 · {lesson.xp} XP</span>
        </div>
        <div className="mobile-lesson-focus-actions">
          <button className="ghost-button" type="button" onClick={() => setMobileLessonInfoOpen(true)}>학습 정보</button>
          <label className="toggle-row lesson-toggle-row">
            <input type="checkbox" checked={showRomaji} onChange={(event) => onToggleRomaji(event.target.checked)} />
            <span>로마자</span>
          </label>
        </div>
        {starterSupportActive ? <p className="lesson-support-banner">입문자 초반 20개 레슨은 로마자와 샘플 듣기를 함께 보여줍니다.</p> : null}
        <div className="progress-bar"><div style={{ width: `${Math.round((completedStepIds.length / Math.max(lesson.steps.length, 1)) * 100)}%` }} /></div>
      </section>
      <section className="lesson-hero desktop-only">
        <div className="hero-copy">
          <p className="eyebrow">현재 학습</p>
          <h3>{lesson.title}</h3>
          <p>{lesson.subtitle}</p>
          <span className="section-hint">{lesson.minutes}분 · {lesson.xp} XP · {stepIndex + 1} / {lesson.steps.length} 단계</span>
        </div>
        <div className="lesson-progress-card">
          <span>이번 학습 목표</span>
          <strong>{lesson.objective}</strong>
          <div className="progress-bar"><div style={{ width: `${Math.round((completedStepIds.length / Math.max(lesson.steps.length, 1)) * 100)}%` }} /></div>
          <span>{completedStepIds.length} / {lesson.steps.length} 단계 완료</span>
          <label className="toggle-row lesson-toggle-row">
            <input type="checkbox" checked={showRomaji} onChange={(event) => onToggleRomaji(event.target.checked)} />
            <span>이 학습에서 로마자 보기</span>
          </label>
          {starterSupportActive ? <p className="lesson-support-banner">입문자 보호 구간이라 이 레슨에서는 로마자와 샘플 듣기를 기본으로 함께 제공합니다.</p> : null}
        </div>
      </section>
      <section className="section-card lesson-stage-card">
        <div className="section-header"><div><p className="eyebrow">학습 단계</p><h3>지금은 한 단계만 집중</h3></div><span className="section-hint">{stepIndex + 1} / {lesson.steps.length}</span></div>
          <StepRenderer
            key={currentStep.id}
            step={currentStep}
            showRomaji={effectiveShowRomaji}
            audioRate={audioRate}
            starterSupportActive={starterSupportActive}
            onSpeakingAssessment={onSpeakingAssessment}
            onComplete={() => markStepComplete(currentStep.id)}
        />
      </section>
      <section className="section-card mobile-only mobile-lesson-switcher">
        <div className="section-header">
          <div>
            <p className="eyebrow">빠른 전환</p>
            <h3>다른 화면으로 바로 이동</h3>
          </div>
        </div>
        <div className="session-grid mobile-lesson-switcher-grid">
          <button className="quick-session-card" type="button" onClick={() => onNavigate('dashboard')}>
            <strong>대시보드</strong>
            <p>오늘 할 학습과 현재 진도를 봅니다.</p>
          </button>
          <button className="quick-session-card" type="button" onClick={() => onNavigate(guidedMode ? 'charts' : 'review')}>
            <strong>{guidedMode ? '문자표' : '복습'}</strong>
            <p>{guidedMode ? '문자표를 바로 확인합니다.' : '틀린 항목부터 다시 봅니다.'}</p>
          </button>
        </div>
      </section>
      <section className="section-card principle-card lesson-principle-card desktop-only">
        <div className="section-header">
          <div>
            <p className="eyebrow">한 줄 원리</p>
            <h3>{lesson.oneLinePrinciple ?? lesson.objective}</h3>
            {lesson.contextHint ? <p>{lesson.contextHint}</p> : null}
          </div>
        </div>
      </section>
      <details className="collapsible-card desktop-only">
        <summary className="collapsible-summary"><div><p className="eyebrow">학습 요약</p><h3>필요할 때만 펼쳐서 봅니다</h3></div><span className="section-hint">보조 정보</span></summary>
        <div className="lesson-overview-grid collapsible-list">
          <InfoCard title="끝나면 할 수 있는 것" items={lesson.canDo} />
          <InfoCard title="핵심 포인트" items={lesson.keyPoints} />
          <InfoCard title="학습 팁" items={lesson.studyTips?.length ? lesson.studyTips : ['빠르게 넘기기보다 입으로 한 번 따라 읽어 보세요.']} />
        </div>
      </details>
      {lesson.exampleCards?.length || lesson.referenceSections?.length ? (
        <details className="collapsible-card desktop-only">
          <summary className="collapsible-summary"><div><p className="eyebrow">보조 자료</p><h3>예문과 참고표는 필요할 때만 봅니다</h3></div><span className="section-hint">보조 정보</span></summary>
          <div className="collapsible-stack">
            {lesson.exampleCards?.length ? <ExampleSection cards={lesson.exampleCards} showRomaji={effectiveShowRomaji} /> : null}
            {lesson.referenceSections?.length ? <ReferenceSection lesson={lesson} showRomaji={effectiveShowRomaji} /> : null}
          </div>
        </details>
      ) : null}
      {allDone ? (
        <section className="section-card completion-card">
          <div className="section-header">
            <div>
              <p className="eyebrow">학습 완료 직전</p>
              <h3>이번 학습을 마무리할 준비가 됐습니다</h3>
            </div>
            <span className="status-done">+{lesson.xp} XP</span>
          </div>
          <p className="muted-copy">핵심 표현을 한 번 더 입으로 읽고, 아래 버튼으로 학습을 완료하세요.</p>
        </section>
      ) : null}
      <div className="action-row action-row-sticky action-row-desktop">
        {!allDone ? (
          <>
            <button className="ghost-button" type="button" onClick={goToPreviousStep} disabled={stepIndex === 0}>이전 단계</button>
            <button className="primary-button" type="button" onClick={goToNextStep} disabled={!currentDone || isLastStep}>다음 단계로</button>
          </>
        ) : (
          <>
            <button className="ghost-button" type="button" onClick={onOpenNext}>다음 학습 미리 보기</button>
            <button className="primary-button primary-cta" type="button" onClick={onCompleteLesson}>학습 완료하기</button>
          </>
        )}
      </div>
      <div className="action-row action-row-mobile mobile-only">
        {!allDone ? (
          <button className="ghost-button" type="button" onClick={goToPreviousStep} disabled={stepIndex === 0}>이전</button>
        ) : (
          <button className="ghost-button" type="button" onClick={onOpenNext}>다음 학습</button>
        )}
        <button className="primary-button primary-cta" type="button" onClick={handleMobilePrimaryAction} disabled={mobilePrimaryDisabled}>{mobilePrimaryLabel}</button>
      </div>
      <LessonInfoSheet
        open={mobileLessonInfoOpen}
        lesson={lesson}
        showRomaji={effectiveShowRomaji}
        guidedMode={guidedMode}
        onClose={() => setMobileLessonInfoOpen(false)}
        onNavigate={(nextView) => {
          setMobileLessonInfoOpen(false)
          onNavigate(nextView)
        }}
      />
    </div>
  )
}

function LessonInfoSheet({
  open,
  lesson,
  showRomaji,
  guidedMode,
  onClose,
  onNavigate,
}: {
  open: boolean
  lesson: Lesson
  showRomaji: boolean
  guidedMode: boolean
  onClose: () => void
  onNavigate: (view: View) => void
}) {
  return (
    <>
      <button
        type="button"
        aria-label="학습 정보 닫기"
        className={`mobile-more-backdrop ${open ? 'mobile-more-backdrop-open' : ''}`}
        onClick={onClose}
      />
      <div className={`mobile-more-sheet mobile-lesson-info-sheet ${open ? 'mobile-more-sheet-open' : ''}`}>
        <div className="mobile-more-sheet-head">
          <div>
            <strong>학습 정보</strong>
            <p className="muted-copy">{lesson.title}</p>
          </div>
          <button type="button" className="ghost-button" onClick={onClose}>닫기</button>
        </div>
        <div className="mobile-lesson-info-stack">
          <section className="section-card lesson-support-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">이번 학습 목표</p>
                <h3>{lesson.objective}</h3>
                <p>{lesson.oneLinePrinciple ?? lesson.objective}</p>
              </div>
            </div>
          </section>
          <section className="section-card lesson-support-card">
            <div className="section-header">
              <div>
                <p className="eyebrow">바로 가기</p>
                <h3>보조 화면 이동</h3>
              </div>
            </div>
            <div className="session-grid mobile-lesson-switcher-grid">
              <button className="quick-session-card" type="button" onClick={() => onNavigate('dashboard')}>
                <strong>대시보드</strong>
                <p>오늘 할 학습과 현재 진도를 봅니다.</p>
              </button>
              <button className="quick-session-card" type="button" onClick={() => onNavigate(guidedMode ? 'charts' : 'review')}>
                <strong>{guidedMode ? '문자표' : '복습'}</strong>
                <p>{guidedMode ? '문자표를 바로 확인합니다.' : '틀린 항목부터 다시 봅니다.'}</p>
              </button>
            </div>
          </section>
          <section className="section-card lesson-support-card">
            <div className="section-header"><div><p className="eyebrow">학습 요약</p><h3>핵심만 빠르게 보기</h3></div></div>
            <div className="stack-md">
              <CompactInfoList title="끝나면 할 수 있는 것" items={lesson.canDo} />
              <CompactInfoList title="핵심 포인트" items={lesson.keyPoints} />
              <CompactInfoList title="학습 팁" items={lesson.studyTips?.length ? lesson.studyTips : ['빠르게 넘기기보다 입으로 한 번 따라 읽어 보세요.']} />
            </div>
          </section>
          {lesson.exampleCards?.length || lesson.referenceSections?.length ? (
            <details className="collapsible-card">
              <summary className="collapsible-summary"><div><p className="eyebrow">추가 자료</p><h3>예문과 참고표 보기</h3></div><span className="section-hint">선택</span></summary>
              <div className="collapsible-stack">
                {lesson.exampleCards?.length ? <ExampleSection cards={lesson.exampleCards} showRomaji={showRomaji} /> : null}
                {lesson.referenceSections?.length ? <ReferenceSection lesson={lesson} showRomaji={showRomaji} /> : null}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </>
  )
}

function CompactInfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="compact-info-card">
      <strong>{title}</strong>
      <ul className="bullet-list compact-bullets">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}
function ReviewPanel({
  mode,
  items,
  audioRate,
  onChangeMode,
  onCompleteSession,
  onSpeakingAssessment,
}: {
  mode: ReviewMode
  items: ReviewItem[]
  audioRate: number
  onChangeMode: (mode: ReviewMode) => void
  onCompleteSession: (results: { reviewItemId: string; correct: boolean }[]) => void
  onSpeakingAssessment: (assessment: 'matched' | 'close' | 'needs-work') => void
}) {
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<{ reviewItemId: string; correct: boolean }[]>([])
  const [finished, setFinished] = useState(false)
  const [showModePicker, setShowModePicker] = useState(false)
  const current = items[index]

  useEffect(() => {
    const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
    if (isPhone) {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [index, finished])

  const restartSession = () => {
    setIndex(0)
    setResults([])
    setFinished(false)
  }

  const applyResult = (reviewItemId: string, correct: boolean) => {
    const nextResults = [...results.filter((item) => item.reviewItemId !== reviewItemId), { reviewItemId, correct }]
    setResults(nextResults)
    if (index >= items.length - 1) {
      setFinished(true)
      onCompleteSession(nextResults)
      return
    }
    setIndex((currentIndex) => currentIndex + 1)
  }

  return (
    <div className="stack-lg">
      <section className="section-card review-stage-card">
        <div className="section-header"><div><p className="eyebrow">복습</p><h3>바로 시작하는 복습</h3></div><span className="section-hint">{mode === 'mixed' ? '기본 모드' : mode === 'reading' ? '읽기 중심' : '말하기 중심'}</span></div>
      </section>
      {!items.length ? <section className="section-card empty-state"><p className="eyebrow">복습 없음</p><h3>아직 복습할 항목이 많지 않습니다</h3><p>학습을 몇 개 더 완료하면 여기에서 자동으로 다시 보게 됩니다.</p></section> : null}
      {current && !finished ? (
        <section className="section-card review-player-card">
          <div className="section-header"><div><p className="eyebrow">현재 문제</p><h3>{current.prompt}</h3></div><span className="section-hint">{index + 1} / {items.length}</span></div>
          {current.type === 'choice' ? (
            <ChoiceReviewCard key={current.id} item={current} onResult={(correct) => applyResult(current.id, correct)} />
          ) : (
            <SpeakingReviewCard
              key={current.id}
              item={current}
              audioRate={audioRate}
              onSpeakingAssessment={onSpeakingAssessment}
              onResult={(correct) => applyResult(current.id, correct)}
            />
          )}
        </section>
      ) : null}
      {finished ? (
        <section className="section-card completion-card">
          <p className="eyebrow">복습 완료</p>
          <h3>이번 복습을 마쳤습니다</h3>
          <p>{results.filter((item) => item.correct).length}개를 안정적으로 풀었습니다. 다음 복습에서는 틀린 항목이 다시 앞쪽에 나옵니다.</p>
          <div className="hero-actions">
            <button className="primary-button primary-cta" type="button" onClick={restartSession}>같은 모드로 다시 시작</button>
            <button className="inline-link" type="button" onClick={() => setShowModePicker((current) => !current)}>
              {showModePicker ? '다른 복습 방식 접기' : '다른 복습 방식 보기'}
            </button>
          </div>
          {showModePicker ? (
            <div className="review-mode-grid">
              <ModeCard title="혼합 복습" description="읽기와 말하기를 함께 다시 봅니다." active={mode === 'mixed'} onClick={() => { onChangeMode('mixed'); setShowModePicker(false) }} />
              <ModeCard title="읽기 집중" description="문자 인식과 선택 문제 위주입니다." active={mode === 'reading'} onClick={() => { onChangeMode('reading'); setShowModePicker(false) }} />
              <ModeCard title="말하기 집중" description="듣고 따라 읽는 흐름에 집중합니다." active={mode === 'speaking'} onClick={() => { onChangeMode('speaking'); setShowModePicker(false) }} />
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function KanaWorkbench({ target, onReplay }: { target: KanaTarget; onReplay: () => void }) {
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  return (
    <section className="section-card kana-workbench">
      <div className="section-header">
        <div>
          <p className="eyebrow">선택한 글자</p>
          <h3>소리를 듣고 바로 써볼 수 있게 묶었습니다</h3>
        </div>
        <span className="section-hint">{target.scriptLabel} · {target.rowLabel}</span>
      </div>
      <div className="kana-workbench-grid">
        <div className="kana-spotlight-card">
          <span className="course-label">{target.scriptLabel}</span>
          <strong className="kana-spotlight-char">{target.kana}</strong>
          <div className="kana-spotlight-meta">
            <span>{target.romaji}</span>
            <span>{target.rowLabel}</span>
          </div>
          <p className="muted-copy">문자표에서 다른 글자를 누르면 이 카드와 쓰기 패드가 바로 바뀌고, 소리도 함께 재생됩니다.</p>
          <div className="inline-actions">
            <button className="ghost-button" type="button" onClick={onReplay} disabled={!speechSupported}>
              다시 듣기
            </button>
          </div>
          {!speechSupported ? <p className="muted-copy">이 브라우저는 음성 재생을 지원하지 않아 쓰기 연습만 사용할 수 있습니다.</p> : null}
        </div>
        <div className="kana-writing-card">
          <div className="kana-writing-head">
            <div>
              <strong>직접 써보기</strong>
              <p>PC는 마우스, 모바일은 터치로 흐린 글자 위에 그대로 따라 써보면 됩니다.</p>
            </div>
            <span className="section-hint">모양 감각 익히기</span>
          </div>
          <KanaWritingPad key={target.kana} target={target.kana} />
        </div>
      </div>
    </section>
  )
}

function KanaSection({
  title,
  script,
  rows,
  activeKana,
  onSelectKana,
}: {
  title: string
  script: KanaScript
  rows: KanaRow[]
  activeKana: string
  onSelectKana: (target: KanaTarget) => void
}) {
  return (
    <section className="section-card">
      <div className="section-header"><div><p className="eyebrow">문자표</p><h3>{title}</h3></div><span className="section-hint">행 이름과 모음을 함께 묶어서 보기</span></div>
      <div className="kana-chart-wrap">
        <div className="kana-chart">
          <div className="kana-row kana-header"><span /><span>a</span><span>i</span><span>u</span><span>e</span><span>o</span></div>
          {rows.map((row) => (
            <div key={`${title}-${row.label}`} className="kana-row">
              <div className="kana-axis"><strong>{row.label}</strong><small>{row.hint}</small></div>
              {row.cells.map((cell, index) =>
                cell.kana ? (
                  <button
                    key={`${row.label}-${index}`}
                    type="button"
                    className={`kana-cell kana-cell-button ${activeKana === cell.kana ? 'kana-cell-active' : ''}`}
                    onClick={() => onSelectKana(createKanaTarget(script, row, cell))}
                    aria-label={`${title} ${cell.kana} ${cell.romaji}`}
                  >
                    {cell.kana}
                  </button>
                ) : (
                  <div key={`${row.label}-${index}`} className="kana-cell kana-cell-empty">·</div>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WelcomeOverlay({
  onFinish,
  busy,
  syncStatus,
  nicknameRequired,
  initialNickname,
}: {
  onFinish: (profile: ProgressState['learnerProfile'], nickname: string) => void | Promise<void>
  busy: boolean
  syncStatus: string
  nicknameRequired: boolean
  initialNickname?: string
}) {
  const [profile, setProfile] = useState<ProgressState['learnerProfile']>('starter')
  const [nickname, setNickname] = useState(initialNickname ?? '')

  const startDisabled = busy || (nicknameRequired && !nickname.trim())

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div>
          <p className="eyebrow">처음 시작하기</p>
          <h2>{nicknameRequired ? '닉네임으로 로그인하고 시작합니다' : '입문자 흐름으로 바로 시작합니다'}</h2>
          <p className="muted-copy">{nicknameRequired ? '같은 닉네임으로 접속하면 이전 학습 기록을 그대로 이어서 볼 수 있습니다.' : '완전 입문자라면 그대로 시작하는 편이 가장 안전합니다. 이미 배웠다면 아래에서만 바꿉니다.'}</p>
        </div>
        <p className="muted-copy">{syncStatus}</p>
        <button className="primary-button" type="button" onClick={() => void onFinish(profile, nickname.trim())} disabled={startDisabled}>
          {busy ? '시작 준비 중...' : nicknameRequired ? '이 닉네임으로 시작합니다' : '이 흐름으로 시작합니다'}
        </button>
        <details className="collapsible-card">
          <summary className="collapsible-summary"><div><p className="eyebrow">다른 시작 방식</p><h3>이미 배웠다면 여기서만 바꿉니다</h3></div><span className="section-hint">선택 사항</span></summary>
          <div className="collapsible-stack">
            <div className="course-grid">
              <ProfileCard title="입문자" description="히라가나부터 천천히 시작" active={profile === 'starter'} onClick={() => setProfile('starter')} />
              <ProfileCard title="다시 시작" description="조금 배웠지만 기본부터 복습" active={profile === 'returning'} onClick={() => setProfile('returning')} />
              <ProfileCard title="빠른 진도" description="이미 경험이 있어 빨리 살펴보기" active={profile === 'fast-track'} onClick={() => setProfile('fast-track')} />
            </div>
            <label>
              <span className="field-label">닉네임 {nicknameRequired ? '(필수)' : '(선택)'}</span>
              <input className="text-input" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder={nicknameRequired ? '예: 민수' : '예: 민수 / 비워두면 스터디 멤버'} />
            </label>
            <button className="primary-button" type="button" onClick={() => void onFinish(profile, nickname.trim())} disabled={startDisabled}>
              {busy ? '저장소 연결 중...' : '선택한 방식으로 시작합니다'}
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}

function ExampleSection({ cards, showRomaji }: { cards: NonNullable<Lesson['exampleCards']>; showRomaji: boolean }) {
  return (
    <div className="section-card lesson-support-card">
      <div className="section-header"><div><p className="eyebrow">예문</p><h3>핵심 예시</h3></div><span className="section-hint">{cards.length}개 카드</span></div>
      <div className="visual-word-grid">
        {cards.map((card, index) => {
          const hint = getVisualHint(card.text)
          return (
            <div key={`${card.title}-${index}`} className="visual-word-card">
              <div className="visual-word-icon" style={{ background: hint.background }}><span>{hint.token}</span></div>
              <div className="visual-word-copy">
                <small>{card.title}</small>
                <strong className="jp-copy">{card.text}</strong>
                {showRomaji && card.romaji ? <span>{card.romaji}</span> : null}
                {card.translation ? <span>{card.translation}</span> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ReferenceSection({ lesson, showRomaji }: { lesson: Lesson; showRomaji: boolean }) {
  return (
    <div className="collapsible-stack">
      {lesson.referenceSections?.map((section) => (
        <div key={section.title} className="section-card lesson-support-card">
          <div className="section-header"><div><p className="eyebrow">참고표</p><h3>{section.title}</h3></div></div>
          <div className="reference-grid">
            {section.rows.map((row) => (
              <div key={`${section.title}-${row.label}`} className="reference-cell">
                <span className="reference-label">{row.label}</span>
                <strong className="reference-kana">{row.kana}</strong>
                {showRomaji ? <span className="reference-romaji">{row.romaji}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
function StepRenderer({
  step,
  showRomaji,
  audioRate,
  starterSupportActive,
  onComplete,
  onSpeakingAssessment,
}: {
  step: Step
  showRomaji: boolean
  audioRate: number
  starterSupportActive: boolean
  onComplete: () => void
  onSpeakingAssessment: (assessment: 'matched' | 'close' | 'needs-work') => void
}) {
  if (step.type === 'content') {
    return (
      <article className="step-card step-card-current">
        <div className="step-head"><div><p className="step-index">설명</p><h4>{step.title}</h4></div><span className="status-open">{step.label}</span></div>
        <div className="step-body">
          <p className="step-copy">{step.description}</p>
          {starterSupportActive ? (
            <div className="lesson-helper-card">
              <strong>먼저 글자와 소리를 연결해 보세요</strong>
              <p>로마자를 함께 보고, 아래 샘플 듣기로 소리를 먼저 확인한 뒤 읽기 완료를 누르면 훨씬 덜 헷갈립니다.</p>
            </div>
          ) : null}
          <div className="language-card">
            {step.text ? <strong className="jp-copy">{step.text}</strong> : null}
            {showRomaji && step.romaji ? <span>{step.romaji}</span> : null}
            {step.translation ? <p>{step.translation}</p> : null}
          </div>
          {step.text ? (
            <div className="lesson-sample-tools">
              <QuickListenButton text={step.text} rate={audioRate} />
              <span className="section-hint">헷갈리면 한 번 더 들은 뒤 읽기 완료를 누르세요.</span>
            </div>
          ) : null}
          {step.bullets?.length ? <ul className="bullet-list compact-bullets">{step.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul> : null}
          <button className="primary-button step-complete-button" type="button" onClick={onComplete}>읽기 완료</button>
        </div>
      </article>
    )
  }

  if (step.type === 'choice') {
    return <ChoiceStepCard step={step} audioRate={audioRate} starterSupportActive={starterSupportActive} onComplete={onComplete} />
  }

  if (step.type === 'checklist') {
    return (
      <article className="step-card step-card-current">
        <div className="step-head"><div><p className="step-index">체크</p><h4>{step.title}</h4></div><span className="status-open">{step.label}</span></div>
        <div className="step-body">
          <p className="step-copy">{step.description}</p>
          <div className="checklist-grid">{step.items.map((item) => <div key={item} className="checklist-item"><span>✓</span><span>{item}</span></div>)}</div>
          <button className="primary-button step-complete-button" type="button" onClick={onComplete}>체크 완료</button>
        </div>
      </article>
    )
  }

  return (
    <article className="step-card step-card-current">
      <div className="step-head"><div><p className="step-index">말하기</p><h4>{step.title}</h4></div><span className="status-open">{step.label}</span></div>
      <SpeakingStepCard step={step} showRomaji={showRomaji} audioRate={audioRate} onComplete={onComplete} onSpeakingAssessment={onSpeakingAssessment} />
    </article>
  )
}

function SpeakingStepCard({
  step,
  showRomaji,
  audioRate,
  onComplete,
  onSpeakingAssessment,
}: {
  step: Extract<Step, { type: 'speaking' }>
  showRomaji: boolean
  audioRate: number
  onComplete: () => void
  onSpeakingAssessment: (assessment: 'matched' | 'close' | 'needs-work') => void
}) {
  return (
    <div className="step-body">
      <p className="step-copy">{step.description}</p>
      <div className="language-card">
        <strong className="jp-copy">{step.text}</strong>
        {showRomaji && step.romaji ? <span>{step.romaji}</span> : null}
        {step.translation ? <p>{step.translation}</p> : null}
      </div>
      <SpeakingPractice
        key={step.id}
        sampleKey={step.id}
        label={step.text}
        hint={step.hint}
        rate={audioRate}
        onComplete={() => {
          onSpeakingAssessment('close')
          onComplete()
        }}
      />
    </div>
  )
}

function ChoiceStepCard({
  step,
  audioRate,
  starterSupportActive,
  onComplete,
}: {
  step: ChoiceStep
  audioRate: number
  starterSupportActive: boolean
  onComplete: () => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const timerRef = useRef<number | null>(null)
  const selectedOption = step.options.find((option) => option.id === selectedId)
  const correctOption = step.options.find((option) => option.isCorrect)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <article className="step-card step-card-current">
      <div className="step-head"><div><p className="step-index">문제</p><h4>{step.title}</h4></div><span className="status-open">{step.label}</span></div>
      <div className="step-body">
        <p className="step-copy">{step.description}</p>
        {step.promptText ? (
          <div className="choice-prompt-card">
            <span className="choice-prompt-label">이번 문제에서 찾을 표현</span>
            <strong>{step.promptText}</strong>
            <p>{starterSupportActive ? '헷갈리면 먼저 샘플을 듣고, 들린 소리와 가장 가까운 답을 고르세요.' : '문제에 나온 표현이 잘 떠오르지 않으면 샘플을 먼저 들어도 됩니다.'}</p>
            <QuickListenButton
              text={correctOption?.label ?? step.promptText}
              rate={audioRate}
              label="샘플 듣기"
            />
          </div>
        ) : null}
        <div className="choice-grid">
          {step.options.map((option) => {
            const selected = selectedId === option.id
            const stateClass = selected ? (option.isCorrect ? 'choice-correct' : 'choice-wrong') : ''
            return (
              <button
                key={option.id}
                type="button"
                className={`choice-card ${stateClass}`}
                disabled={locked}
                onClick={() => {
                  if (locked) return
                  setSelectedId(option.id)
                  if (option.isCorrect) {
                    setLocked(true)
                    timerRef.current = window.setTimeout(() => {
                      onComplete()
                    }, 450)
                  }
                }}
              >
                <strong>{option.label}</strong>
                <span>{selected ? option.explanation : '선택해 보기'}</span>
              </button>
            )
          })}
        </div>
        {selectedOption ? (
          <p className="muted-copy">
            {selectedOption.isCorrect
              ? `맞았습니다. ${step.teachingNote ?? selectedOption.explanation} 잠시 뒤 다음 단계로 이어집니다.`
              : `오답 포인트: ${selectedOption.explanation} ${step.teachingNote ? `${step.teachingNote} ` : ''}${correctOption ? `정답은 ${correctOption.label}입니다.` : ''}`}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function ChoiceReviewCard({ item, onResult }: { item: Extract<ReviewItem, { type: 'choice' }>; onResult: (correct: boolean) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const timerRef = useRef<number | null>(null)
  const selectedOption = item.options.find((option) => option.id === selectedId)
  const correctOption = item.options.find((option) => option.isCorrect)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  const getAdvanceDelay = (correct: boolean) => {
    const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 720px)').matches
    if (isPhone) return correct ? 1600 : 2800
    return correct ? 900 : 1800
  }

  return (
    <div className="stack-md">
      <div className="language-card"><strong className="jp-copy">{item.translation ?? item.text}</strong><p>{item.prompt}</p></div>
      <div className="choice-grid">
        {item.options.map((option) => {
          const selected = selectedId === option.id
          const revealCorrect = Boolean(selectedOption && !selectedOption.isCorrect && option.isCorrect)
          const stateClass = selected ? (option.isCorrect ? 'choice-correct' : 'choice-wrong') : revealCorrect ? 'choice-correct' : ''
          return (
            <button
              key={option.id}
              type="button"
              className={`choice-card ${stateClass}`}
              disabled={submitted}
              onClick={() => {
                if (submitted) return
                setSelectedId(option.id)
                setSubmitted(true)
                timerRef.current = window.setTimeout(() => {
                  onResult(option.isCorrect)
                }, getAdvanceDelay(option.isCorrect))
              }}
            >
              <strong>{option.label}</strong>
              <span>{option.explanation}</span>
            </button>
          )
        })}
      </div>
      {selectedOption ? (
        <p className="muted-copy">
          {selectedOption.isCorrect
            ? `맞았습니다. ${item.teachingNote ?? selectedOption.explanation} 바로 다음 문제로 넘어갑니다.`
            : `틀렸습니다. ${selectedOption.explanation} ${item.teachingNote ? `${item.teachingNote} ` : ''}${correctOption ? `정답은 ${correctOption.label}입니다.` : ''} 곧 다음 문제로 넘어갑니다.`}
        </p>
      ) : null}
    </div>
  )
}

function SpeakingReviewCard({
  item,
  audioRate,
  onResult,
  onSpeakingAssessment,
}: {
  item: Extract<ReviewItem, { type: 'speaking' }>
  audioRate: number
  onResult: (correct: boolean) => void
  onSpeakingAssessment: (assessment: 'matched' | 'close' | 'needs-work') => void
}) {
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <div className="stack-md">
      <div className="language-card">
        <strong className="jp-copy">{item.text}</strong>
        {item.romaji ? <span>{item.romaji}</span> : null}
        <p>{item.translation}</p>
      </div>
      <SpeakingPractice
        key={item.id}
        sampleKey={item.id}
        label={item.text}
        hint={item.hint}
        rate={audioRate}
        onComplete={() => {
          onSpeakingAssessment('close')
          timerRef.current = window.setTimeout(() => {
            onResult(true)
          }, 800)
        }}
      />
      <p className="muted-copy">샘플 재생이 끝나면 잠시 후 다음 문제로 넘어갑니다.</p>
    </div>
  )
}

function ImportCard({ onImport }: { onImport: (progress: ProgressState) => void }) {
  const [status, setStatus] = useState('')
  return (
    <div className="support-note">
      <strong>기록 가져오기</strong>
      <p>다른 기기에서 저장한 JSON 파일을 선택하면 현재 기기에 불러옵니다.</p>
      <label className="ghost-button" style={{ display: 'inline-flex', justifyContent: 'center' }}>
        파일 선택
        <input type="file" accept="application/json" hidden onChange={async (event) => {
          const file = event.target.files?.[0]
          if (!file) return
          try {
            const text = await file.text()
            onImport(JSON.parse(text) as ProgressState)
            setStatus('가져오기를 완료했습니다.')
          } catch {
            setStatus('가져오기에 실패했습니다.')
          }
        }} />
      </label>
      {status ? <p>{status}</p> : null}
    </div>
  )
}

function ProfileCard({ title, description, active, onClick }: { title: string; description: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`course-card ${active ? 'course-card-active' : ''}`} onClick={onClick}><strong>{title}</strong><p>{description}</p></button>
}
function ModeCard({ title, description, active, onClick }: { title: string; description: string; active: boolean; onClick: () => void }) {
  return <button type="button" className={`mode-card ${active ? 'mode-card-active' : ''}`} onClick={onClick}><strong>{title}</strong><span>{description}</span></button>
}
function MetricChip({ label, value, helper }: { label: string; value: string; helper: string }) {
  return <div className="metric-chip"><span>{label}</span><strong>{value}</strong><span>{helper}</span></div>
}
function InfoCard({ title, items }: { title: string; items: string[] }) {
  return <div className="info-pill"><strong>{title}</strong><ul className="bullet-list compact-bullets">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>
}
function navClass(active: boolean) { return `nav-button ${active ? 'nav-button-active' : ''}` }
function lessonButtonClass(selected: boolean, completed: boolean, locked: boolean) { return `lesson-button ${selected ? 'lesson-button-selected' : ''} ${completed ? 'lesson-button-complete' : ''} ${locked ? 'lesson-button-locked' : ''}` }
function getPageTitle(view: View, lessonTitle?: string) { return view === 'lesson' ? lessonTitle ?? '학습' : view === 'dashboard' ? '오늘의 학습 안내' : view === 'path' ? '코스 전체 학습 경로' : view === 'review' ? '복습' : view === 'charts' ? '히라가나 · 가타카나 문자표' : '학습 설정' }
function getPageDescription(view: View, courseTitle: string, lessonSubtitle?: string) { return view === 'lesson' ? lessonSubtitle ?? '설명부터 말하기까지 차례대로 진행합니다.' : view === 'dashboard' ? `${courseTitle} 기준으로 오늘 무엇부터 할지 바로 보이도록 정리했습니다.` : view === 'path' ? '학습 묶음과 학습 순서를 한 번에 보고 다음에 열리는 학습을 확인할 수 있습니다.' : view === 'review' ? '틀렸던 항목과 오래 보지 않은 항목부터 다시 보여줍니다.' : view === 'charts' ? '행과 모음을 함께 묶어서 보는 문자표입니다.' : '로마자, 음성 속도, 진도 백업을 조정합니다.' }
function getCourseLocks(counts: Record<Course['id'], number>, checkpointCounts: Record<Course['id'], number>, learnerProfile: ProgressState['learnerProfile']): Record<Course['id'], boolean> {
  if (learnerProfile !== 'starter') {
    return {
      starter: false,
      beginner: false,
      intermediate: false,
      advanced: false,
    }
  }
  const unlockThreshold = 24
  return {
    starter: false,
    beginner: counts.starter < unlockThreshold || checkpointCounts.starter < 1,
    intermediate: counts.beginner < unlockThreshold || checkpointCounts.beginner < 1,
    advanced: counts.intermediate < unlockThreshold || checkpointCounts.intermediate < 1,
  }
}
function shouldForceStarterSupport(lesson: Lesson, learnerProfile: ProgressState['learnerProfile'], lessonOrder: Lesson[]) {
  if (learnerProfile !== 'starter' || lesson.courseId !== 'starter') {
    return false
  }

  const starterIndex = lessonOrder
    .filter((candidate) => candidate.courseId === 'starter')
    .findIndex((candidate) => candidate.id === lesson.id)

  return starterIndex >= 0 && starterIndex < starterSupportLessonCount
}
function getUnitTrack(unit: { phase: string; title: string }) {
  const text = `${unit.phase} ${unit.title}`
  if (/체크|점검|checkpoint/i.test(text)) return 'checkpoint' as const
  if (/강화|드릴|복습|연습/i.test(text)) return 'reinforcement' as const
  return 'core' as const
}
function getUnitTrackLabel(track: ReturnType<typeof getUnitTrack>) {
  return track === 'checkpoint' ? '체크포인트' : track === 'reinforcement' ? '강화 드릴' : '핵심 학습'
}
function getNextLessonId(currentLessonId: string, courseLessons: Lesson[]) { const index = courseLessons.findIndex((lesson) => lesson.id === currentLessonId); return index >= 0 && index < courseLessons.length - 1 ? courseLessons[index + 1].id : undefined }
function getReviewPriority(progress: ProgressState, item: ReviewItem) { const stat = progress.reviewStats[item.id]; if (!stat) return 100; const days = stat.lastReviewedOn ? localDayDiff(stat.lastReviewedOn, localTodayKey()) : 7; return stat.incorrect * 12 + days * 4 - stat.correct * 2 + (stat.lastOutcome === 'incorrect' ? 8 : 0) }
function getReviewItemSummary(item: ReviewItem) {
  return item.translation ?? item.prompt ?? item.text
}
function getReviewReason(progress: ProgressState, item: ReviewItem) {
  const stat = progress.reviewStats[item.id]
  if (!stat) return '아직 기록이 적어도, 이후 복습 우선순위에 바로 반영됩니다.'
  if (stat.lastOutcome === 'incorrect') return `최근에 한 번 틀렸고, 총 ${stat.incorrect}번 흔들린 항목입니다.`
  if (stat.incorrect > stat.correct) return `정답보다 오답이 더 많아 다시 보는 편이 좋습니다.`
  if (stat.lastReviewedOn) {
    const days = localDayDiff(stat.lastReviewedOn, localTodayKey())
    return days >= 2 ? `${days}일 동안 다시 보지 않아 우선순위가 올라왔습니다.` : '최근 복습 기록이 있어 짧게 한 번만 확인하면 됩니다.'
  }
  return '최근 기록이 없어 우선순위 상단에 있습니다.'
}
function getMobileMoreDescription(view: View) {
  return view === 'path'
    ? '전체 학습 순서와 다음에 열릴 단원을 봅니다.'
    : view === 'charts'
      ? '히라가나와 가타카나 문자표를 한 번에 봅니다.'
      : view === 'settings'
        ? '로마자, 음성 속도, 백업 설정을 바꿉니다.'
        : '보조 화면을 엽니다.'
}
function getVisualHint(text: string) { const first = text.trim()[0] ?? 'J'; const palette = ['linear-gradient(135deg, #3182f6 0%, #5aa5ff 100%)', 'linear-gradient(135deg, #08b26a 0%, #3ed598 100%)', 'linear-gradient(135deg, #00b0c7 0%, #34d3e5 100%)', 'linear-gradient(135deg, #7c4dff 0%, #a67bff 100%)']; return { token: /[A-Za-z]/.test(first) ? first.toUpperCase() : first, background: palette[text.length % palette.length] } }
function exportProgress(progress: ProgressState) { const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `japanese-study-progress-${localTodayKey()}.json`; link.click(); URL.revokeObjectURL(url) }
function sanitizeProgress(raw: Partial<ProgressState>, courseCatalog: Course[]) { const initial = createInitialProgress(); return { ...initial, ...raw, completedLessonIds: Array.isArray(raw.completedLessonIds) ? raw.completedLessonIds.filter((id): id is string => typeof id === 'string') : initial.completedLessonIds, badgeIds: Array.isArray(raw.badgeIds) ? raw.badgeIds.filter((id): id is string => typeof id === 'string') : initial.badgeIds, selectedCourseId: courseCatalog.some((course) => course.id === raw.selectedCourseId) ? (raw.selectedCourseId as Course['id']) : initial.selectedCourseId, learnerProfile: raw.learnerProfile === 'starter' || raw.learnerProfile === 'returning' || raw.learnerProfile === 'fast-track' ? raw.learnerProfile : initial.learnerProfile, onboardingComplete: typeof raw.onboardingComplete === 'boolean' ? raw.onboardingComplete : initial.onboardingComplete, reviewStats: raw.reviewStats ?? initial.reviewStats, speakingStats: { attempts: typeof raw.speakingStats?.attempts === 'number' ? raw.speakingStats.attempts : initial.speakingStats.attempts, matched: typeof raw.speakingStats?.matched === 'number' ? raw.speakingStats.matched : initial.speakingStats.matched, close: typeof raw.speakingStats?.close === 'number' ? raw.speakingStats.close : initial.speakingStats.close, needsWork: typeof raw.speakingStats?.needsWork === 'number' ? raw.speakingStats.needsWork : initial.speakingStats.needsWork, recent: Array.isArray(raw.speakingStats?.recent) ? raw.speakingStats.recent.filter((item): item is ProgressState['speakingStats']['recent'][number] => Boolean(item && typeof item.date === 'string' && (item.assessment === 'matched' || item.assessment === 'close' || item.assessment === 'needs-work'))) : initial.speakingStats.recent }, settings: { showRomaji: typeof raw.settings?.showRomaji === 'boolean' ? raw.settings.showRomaji : initial.settings.showRomaji, audioRate: typeof raw.settings?.audioRate === 'number' ? raw.settings.audioRate : initial.settings.audioRate } } }
function localTodayKey(date = new Date()) { return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' }).format(date) }
function localDayDiff(fromKey: string, toKey: string) { const from = new Date(`${fromKey}T00:00:00+09:00`); const to = new Date(`${toKey}T00:00:00+09:00`); return Math.round((to.getTime() - from.getTime()) / 86400000) }
export default App
