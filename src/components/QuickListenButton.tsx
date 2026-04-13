import { useEffect, useRef, useState } from 'react'

type QuickListenButtonProps = {
  text: string
  rate?: number
  label?: string
  className?: string
}

export function QuickListenButton({
  text,
  rate = 0.9,
  label = '샘플 듣기',
  className = '',
}: QuickListenButtonProps) {
  const [playing, setPlaying] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const disabled = !supported || !text.trim()

  useEffect(() => {
    return () => {
      if (!supported) return
      window.speechSynthesis.cancel()
      utteranceRef.current = null
    }
  }, [supported])

  const handlePlay = () => {
    if (disabled) return

    const utterance = new SpeechSynthesisUtterance(text.replace(/\s+/g, ' ').trim())
    const voice = window.speechSynthesis.getVoices().find((entry) => entry.lang.toLowerCase().startsWith('ja'))

    if (voice) {
      utterance.voice = voice
    }

    utterance.lang = 'ja-JP'
    utterance.rate = rate
    utterance.onstart = () => setPlaying(true)
    utterance.onend = () => {
      setPlaying(false)
      utteranceRef.current = null
    }
    utterance.onerror = () => {
      setPlaying(false)
      utteranceRef.current = null
    }

    utteranceRef.current = utterance
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      className={`ghost-button quick-listen-button ${className}`.trim()}
      type="button"
      onClick={handlePlay}
      disabled={disabled}
    >
      {playing ? '재생 중...' : disabled ? '샘플 듣기 미지원' : label}
    </button>
  )
}
