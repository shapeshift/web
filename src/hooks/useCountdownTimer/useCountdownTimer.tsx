import { useCallback, useEffect, useState } from 'react'

export const useCountdownTimer = (initialSeconds: number) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds)
  const [progress, setProgress] = useState(100)

  const reset = useCallback(() => {
    setSecondsRemaining(initialSeconds)
    setProgress(100)
  }, [initialSeconds])

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (secondsRemaining > 0) {
        const newProgress = (secondsRemaining / initialSeconds) * 100
        setProgress(newProgress)
        setSecondsRemaining(secondsRemaining - 1)
      }
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [secondsRemaining, initialSeconds])

  return { progress, reset }
}
