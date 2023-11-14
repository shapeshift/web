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
  isActive: boolean
  start: () => void
  reset: () => void
} => {
  const id = useRef<NodeJS.Timeout | null>(null)
  const [timeRemainingMs, setTimeRemainingMs] = useState(initialTimeMs)
  const [isActive, setIsActive] = useState(autoStart)

  const handleDecrement = useCallback(() => {
    setTimeRemainingMs(time => {
      if (time - 1000 <= 0) {
        if (id.current) clearInterval(id.current)
        onCompleted?.()

        return 0
      }

      return time - 1000
    })
  }, [onCompleted])

  useEffect(() => {
    if (isActive) {
      id.current = setInterval(handleDecrement, 1000)
    }

    return () => {
      if (id.current) clearInterval(id.current)
    }
  }, [isActive, handleDecrement])

  const start = useCallback((): void => {
    setIsActive(true)
  }, [])

  const reset = useCallback(() => {
    if (id.current) clearInterval(id.current)

    setIsActive(autoStart)
    setTimeRemainingMs(initialTimeMs)
  }, [autoStart, initialTimeMs])

  return {
    timeRemainingMs,
    isActive,
    start,
    reset,
  }
}
