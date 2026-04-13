import { useEffect, useMemo, useRef, useState } from 'react'

import { getAudioSample } from '../data/audioCatalog'

type Assessment = 'matched' | 'close' | 'needs-work'
type SampleMode = 'recorded' | 'tts' | 'manual'
type ChecklistPoint = {
  title: string
  detail: string
}

type SpeakingPracticeProps = {
  sampleKey: string
  label: string
  hint: string
  rate: number
  onComplete: (assessment: Assessment) => void
}

export function SpeakingPractice({ sampleKey, label, hint, rate, onComplete }: SpeakingPracticeProps) {
  const [samplePlaying, setSamplePlaying] = useState(false)
  const [samplePlayedOnce, setSamplePlayedOnce] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifiedRecordedUrl, setVerifiedRecordedUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const completionTriggeredRef = useRef(false)
  const supportsSpeech = typeof window !== 'undefined' && 'speechSynthesis' in window
  const preferredSample = useMemo(() => getAudioSample(sampleKey), [sampleKey])
  const checklist = useMemo(() => buildSpeakingChecklist(label), [label])
  const recordedSampleReady = preferredSample ? verifiedRecordedUrl === preferredSample.url : false
  const sampleMode: SampleMode = recordedSampleReady ? 'recorded' : supportsSpeech ? 'tts' : 'manual'
  const sampleCopy = recordedSampleReady
    ? '고정 음원이 준비되어 있어 먼저 그 음원을 재생합니다.'
    : preferredSample
      ? supportsSpeech
        ? '고정 음원이 없거나 열리지 않으면 브라우저 음성으로 샘플을 재생합니다.'
        : '샘플 음성이 없어 직접 읽기 기준으로 진행합니다.'
      : supportsSpeech
        ? '브라우저 음성으로 샘플을 재생합니다.'
        : '샘플 음성이 없어 직접 읽기 기준으로 진행합니다.'

  useEffect(() => {
    if (!preferredSample) return

    let cancelled = false

    fetch(preferredSample.url, { method: 'HEAD' })
      .then((response) => {
        if (cancelled) return
        setVerifiedRecordedUrl(response.ok ? preferredSample.url : null)
      })
      .catch(() => {
        if (cancelled) return
        setVerifiedRecordedUrl(null)
      })

    return () => {
      cancelled = true
    }
  }, [preferredSample])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null

      if (supportsSpeech) {
        window.speechSynthesis.cancel()
      }
    }
  }, [supportsSpeech])

  const stopSamplePlayback = () => {
    audioRef.current?.pause()
    audioRef.current = null

    if (supportsSpeech) {
      window.speechSynthesis.cancel()
    }

    setSamplePlaying(false)
  }

  const finishPractice = () => {
    setSamplePlayedOnce(true)

    if (completionTriggeredRef.current) return

    completionTriggeredRef.current = true
    onComplete('close')
  }

  const playTtsSample = () => {
    if (!supportsSpeech) {
      setError('이 브라우저에서는 샘플 음성을 자동으로 재생할 수 없습니다.')
      finishPractice()
      return
    }

    stopSamplePlayback()

    const utterance = new SpeechSynthesisUtterance(label)
    const voice = window.speechSynthesis.getVoices().find((entry) => entry.lang.toLowerCase().startsWith('ja'))

    if (voice) {
      utterance.voice = voice
    }

    utterance.lang = 'ja-JP'
    utterance.rate = rate
    utterance.onstart = () => setSamplePlaying(true)
    utterance.onend = () => {
      setSamplePlaying(false)
      finishPractice()
    }
    utterance.onerror = () => {
      setSamplePlaying(false)
      setError('샘플 음성 재생에 실패했습니다. 직접 읽고 진행해도 괜찮습니다.')
      finishPractice()
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  const playRecordedSample = () => {
    if (!preferredSample) {
      playTtsSample()
      return
    }

    stopSamplePlayback()

    const audio = new Audio(preferredSample.url)
    audio.preload = 'auto'
    audioRef.current = audio
    audio.onplay = () => setSamplePlaying(true)
    audio.onended = () => {
      setSamplePlaying(false)
      finishPractice()
    }
    audio.onerror = () => {
      setSamplePlaying(false)

      if (supportsSpeech) {
        playTtsSample()
        return
      }

      finishPractice()
    }

    const playPromise = audio.play()
    if (playPromise) {
      playPromise.catch(() => {
        setSamplePlaying(false)

        if (supportsSpeech) {
          playTtsSample()
          return
        }

        finishPractice()
      })
    }
  }

  const playSample = () => {
    setError(null)

    if (sampleMode === 'recorded') {
      playRecordedSample()
      return
    }

    if (sampleMode === 'tts') {
      playTtsSample()
      return
    }

    finishPractice()
  }

  const sampleButtonLabel =
    sampleMode === 'recorded'
      ? samplePlaying
        ? '고정 음원 재생 중...'
        : samplePlayedOnce
          ? '고정 음원 다시 듣기'
          : '고정 음원 듣기'
      : sampleMode === 'tts'
        ? samplePlaying
          ? '샘플 음성 재생 중...'
          : samplePlayedOnce
            ? '샘플 음성 다시 듣기'
            : '샘플 음성 듣기'
        : samplePlayedOnce
          ? '한 번 더 읽어 보기'
          : '샘플 없이 직접 읽기'

  const sampleModeLabel =
    sampleMode === 'recorded' ? '고정 음원' : sampleMode === 'tts' ? '브라우저 음성' : '직접 읽기'

  const needsSampleFirst = sampleMode !== 'manual'

  return (
    <div className="speaking-card">
      <div className="sample-source-row">
        <span className={`sample-source-badge sample-source-${sampleMode}`}>{sampleModeLabel}</span>
        <span className="sample-source-copy desktop-only">{sampleCopy}</span>
        <span className="sample-source-copy mobile-only">
          {sampleMode === 'recorded' ? '고정 음원 사용' : sampleMode === 'tts' ? '브라우저 음성 사용' : '직접 읽기'}
        </span>
      </div>
      <p className="speaking-hint">{hint}</p>
      <div className="speaking-checklist desktop-only">
        <div className="self-check-copy">
          <strong>따라 읽기 포인트</strong>
          <span>샘플을 한 번 듣고 아래 기준만 떠올린 뒤 그대로 읽어 보면 충분합니다.</span>
        </div>
        <div className="speaking-anchor-list">
          {checklist.map((item) => (
            <div key={item.title} className="speaking-anchor-item">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      </div>
      <details className="mobile-only speaking-mobile-tips">
        <summary className="collapsible-summary">
          <div>
            <p className="eyebrow">발음 팁</p>
            <h3>체크포인트 {checklist.length}개</h3>
          </div>
          <span className="section-hint">필요할 때만</span>
        </summary>
        <div className="speaking-anchor-list">
          {checklist.map((item) => (
            <div key={item.title} className="speaking-anchor-item">
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </div>
          ))}
        </div>
      </details>

      <div className="inline-actions">
        <button className="ghost-button" type="button" onClick={playSample}>
          {sampleButtonLabel}
        </button>
      </div>

      <p className="speaking-feedback">
        {samplePlayedOnce
          ? '샘플 확인이 끝났습니다. 아래 다음 단계 버튼으로 바로 넘어가면 됩니다.'
          : needsSampleFirst
            ? '샘플을 한 번 듣고 그대로 따라 읽으면, 재생이 끝나는 즉시 아래 다음 단계 버튼이 활성화됩니다.'
            : '직접 한 번 읽어 본 뒤 아래 다음 단계 버튼으로 넘어가면 됩니다.'}
      </p>
      {error ? <p className="error-copy">{error}</p> : null}
    </div>
  )
}

function buildSpeakingChecklist(label: string): ChecklistPoint[] {
  const compact = label.replace(/\s+/g, '')
  const points: ChecklistPoint[] = [
    {
      title: '박자',
      detail: '글자 수만큼 일정한 길이로 읽고, 중간 속도를 갑자기 올리지 않습니다.',
    },
  ]

  if (/[ゃゅょャュョっッ]/.test(compact)) {
    points.push({
      title: '붙여 읽기',
      detail: '작은 글자는 앞 글자에 붙여 하나의 소리 덩어리처럼 읽습니다.',
    })
  }

  if (/[ーおうこうそうとうどうきょうしょうちょう]/.test(compact)) {
    points.push({
      title: '길게 늘이는 소리',
      detail: '늘어나는 소리가 들리면 한 박자 더 준다고 생각하고 읽어 보세요.',
    })
  }

  if (/[・、。]/.test(label)) {
    points.push({
      title: '끊어 읽기',
      detail: '구분 기호는 멈춤 신호처럼 보고, 단어 안에서는 다시 붙여 읽습니다.',
    })
  }

  if (/ん$/.test(compact)) {
    points.push({
      title: '끝소리',
      detail: '마지막 n 소리를 너무 세게 닫지 말고 부드럽게 마무리합니다.',
    })
  } else {
    points.push({
      title: '끝맺기',
      detail: '마지막 글자를 흘리지 말고 끝까지 또렷하게 마무리합니다.',
    })
  }

  return points.slice(0, 3)
}
