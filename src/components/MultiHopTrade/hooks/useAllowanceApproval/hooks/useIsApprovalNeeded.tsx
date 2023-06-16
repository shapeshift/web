import { useCallback, useEffect, useState } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { TradeQuote } from 'lib/swapper/api'

import { APPROVAL_CHECK_INTERVAL_MILLISECONDS } from '../../constants'
import { checkApprovalNeeded } from '../helpers'

export const useIsApprovalNeeded = (tradeQuoteStep: TradeQuote['steps'][number]) => {
  const [isApprovalNeeded, setIsApprovalNeeded] = useState<boolean | undefined>(undefined)
  const [isPollingStopped, setIsPollingStopped] = useState(false)
  const { poll, cancelPolling } = usePoll()
  const wallet = useWallet().state.wallet

  useEffect(() => {
    poll({
      fn: async () => {
        console.log('useIsApprovalNeeded poll')
        if (!wallet) return
        const isApprovalNeeded = await checkApprovalNeeded(tradeQuoteStep, wallet)
        if (!isPollingStopped) setIsApprovalNeeded(isApprovalNeeded)
      },
      validate: () => false,
      interval: APPROVAL_CHECK_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [isPollingStopped, poll, tradeQuoteStep, wallet])

  const stopPolling = useCallback(() => {
    console.log('useIsApprovalNeeded stopPolling')
    cancelPolling()
    setIsPollingStopped(true)
  }, [cancelPolling])

  return { isApprovalNeeded, stopPolling }
}
