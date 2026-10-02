import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { formatSecondsToDuration } from '@/lib/utils/time'

const TICK_INTERVAL_MS = 60_000

export const useArbitrumClaimTimeText = (claimableAt: number | undefined): string => {
  const translate = useTranslate()
  const [now, setNow] = useState(Date.now)

  useEffect(() => {
    setNow(Date.now())
    if (!claimableAt || claimableAt <= Date.now()) return

    const interval = setInterval(() => {
      const nextNow = Date.now()
      setNow(nextNow)
      if (nextNow >= claimableAt) clearInterval(interval)
    }, TICK_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [claimableAt])

  const secondsUntilClaimable = claimableAt ? (claimableAt - now) / 1000 : 0

  return secondsUntilClaimable > 0
    ? formatSecondsToDuration(secondsUntilClaimable, true)
    : translate('actionCenter.bridge.availableSoon')
}
