import { useCallback, useEffect, useRef, useState } from 'react'

export const useCountdown = (
  initialTimeMs: number,
  onCompleted?: () => void,
): {
  timeRemainingMs: number
  start: () => void
  reset: () => void
} => {
  const [timeRemainingMs, setTimeRemainingMs] = useState(initialTimeMs)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const onCompletedRef = useRef(onCompleted)

  // Keep callback fresh without triggering effects
  onCompletedRef.current = onCompleted

  const start = useCallback((): void => {
    if (intervalRef.current) return // Already running

    intervalRef.current = setInterval(() => {
      setTimeRemainingMs(prev => {
        const newTime = prev - 1000

        if (newTime <= 0) {
          clearInterval(intervalRef.current ?? undefined)
          intervalRef.current = null
          onCompletedRef.current?.()
          return 0
        }

        return newTime
      })
    }, 1000)
  }, [])

  const reset = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimeRemainingMs(initialTimeMs)
  }, [initialTimeMs])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return {
    timeRemainingMs,
    start,
    reset,
  }
}
