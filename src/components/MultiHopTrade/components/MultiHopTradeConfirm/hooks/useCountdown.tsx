import { useCallback, useEffect, useRef, useState } from 'react'

type UseCountdownProps = {
  initialTimeMs: number
  autoStart?: boolean
  onCompleted?: () => void
}

export const useCountdown = ({
  initialTimeMs,
  autoStart = false,
  onCompleted,
}: UseCountdownProps): {
  timeRemainingMs: number
  start: () => void
  reset: () => void
} => {
  const id = useRef<NodeJS.Timeout | null>(null)
  const [timeRemainingMs, setTimeRemainingMs] = useState(initialTimeMs)

  const handleDecrement = useCallback(() => {
    setTimeRemainingMs(time => {
      if (time - 1000 <= 0) {
        if (id.current) {
          clearInterval(id.current)
          id.current = null
        }
        onCompleted?.()

        return 0
      }

      return time - 1000
    })
  }, [onCompleted])

  useEffect(() => {
    return () => {
      if (id.current) clearInterval(id.current)
    }
  }, [handleDecrement])

  const start = useCallback((): void => {
    if (id.current) return
    id.current = setInterval(handleDecrement, 1000)
  }, [handleDecrement])

  const reset = useCallback(() => {
    if (id.current) {
      clearInterval(id.current)
      id.current = null
    }
    setTimeRemainingMs(initialTimeMs)
  }, [initialTimeMs])

  useEffect(() => {
    if (autoStart) start()
  }, [autoStart, start])

  return {
    timeRemainingMs,
    start,
    reset,
  }
}
