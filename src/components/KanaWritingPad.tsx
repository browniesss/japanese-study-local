import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

type Point = { x: number; y: number }
type Stroke = Point[]

type KanaWritingPadProps = {
  target: string
}

type CanvasSize = {
  width: number
  height: number
}

export function KanaWritingPad({ target }: KanaWritingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const contextRef = useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = useRef<CanvasSize>({ width: 0, height: 0 })
  const activeStrokeRef = useRef<Stroke | null>(null)
  const strokesRef = useRef<Stroke[]>([])
  const [strokeCount, setStrokeCount] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))

      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))

      const context = canvas.getContext('2d')
      if (!context) return

      context.setTransform(1, 0, 0, 1, 0, 0)
      context.scale(ratio, ratio)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.strokeStyle = '#191f28'
      context.lineWidth = Math.max(5, width * 0.018)

      contextRef.current = context
      sizeRef.current = { width, height }
      drawStrokes(context, sizeRef.current, strokesRef.current)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = contextRef.current
    if (!canvas || !context) return

    const point = getPoint(event, canvas)
    const nextStroke: Stroke = [point]
    strokesRef.current.push(nextStroke)
    activeStrokeRef.current = nextStroke
    setStrokeCount(strokesRef.current.length)

    canvas.setPointerCapture(event.pointerId)
    drawStrokes(context, sizeRef.current, strokesRef.current)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const context = contextRef.current
    const activeStroke = activeStrokeRef.current
    if (!canvas || !context || !activeStroke) return

    activeStroke.push(getPoint(event, canvas))
    drawStrokes(context, sizeRef.current, strokesRef.current)
  }

  const finishStroke = (event?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event && canvasRef.current?.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId)
    }
    activeStrokeRef.current = null
  }

  const clearPad = () => {
    strokesRef.current = []
    activeStrokeRef.current = null
    setStrokeCount(0)

    if (contextRef.current) {
      drawStrokes(contextRef.current, sizeRef.current, strokesRef.current)
    }
  }

  return (
    <div className="kana-pad-shell">
      <div className="kana-pad-surface">
        <div className="kana-pad-guide" aria-hidden="true">
          <span>{target}</span>
        </div>
        <canvas
          ref={canvasRef}
          className="kana-pad-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
        />
      </div>
      <div className="kana-pad-actions">
        <span className="section-hint">{strokeCount ? `${strokeCount}번 그렸습니다` : '흐린 글자 위에 그대로 써보며 모양을 익혀 보세요.'}</span>
        <button className="ghost-button" type="button" onClick={clearPad}>
          지우기
        </button>
      </div>
    </div>
  )
}

function getPoint(event: ReactPointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function drawStrokes(context: CanvasRenderingContext2D, size: CanvasSize, strokes: Stroke[]) {
  context.clearRect(0, 0, size.width, size.height)

  strokes.forEach((stroke) => {
    if (stroke.length === 0) return

    if (stroke.length === 1) {
      const point = stroke[0]
      context.beginPath()
      context.arc(point.x, point.y, context.lineWidth * 0.5, 0, Math.PI * 2)
      context.fillStyle = '#191f28'
      context.fill()
      return
    }

    context.beginPath()
    context.moveTo(stroke[0].x, stroke[0].y)
    stroke.slice(1).forEach((point) => {
      context.lineTo(point.x, point.y)
    })
    context.stroke()
  })
}
