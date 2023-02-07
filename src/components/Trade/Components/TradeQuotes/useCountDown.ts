import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { useEffect, useState } from 'react'
export function useCountdown(mins: number) {
  const [secs, decrement] = useState<number>(mins * 60)
  const [progress, increment] = useState<number>(0)
  useEffect(() => {
    if (secs > 0) {
      const progressLevel = setInterval(() => {
        increment(progress + 100 / (mins * 60))
        decrement(secs - 1)
      }, 1000)
      return () => clearInterval(progressLevel)
    } else {
      increment(0)
      decrement(mins * 60)
    }
  }, [progress, secs, mins])
  const min = parseInt(bnOrZero(secs).div(60).toString(), 10)
  const sec = parseInt(bnOrZero(secs).times(60).toString(), 10)
  const minutes = min < 10 ? '0' + min : min
  const seconds = sec < 10 ? '0' + sec : sec
  return { progress, minutes, seconds }
}
