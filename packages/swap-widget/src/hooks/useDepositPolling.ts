import { useEffect, useRef } from 'react'

import type { ApiClient } from '../api/client'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { DepositStatusResponse } from '../utils/depositStatus'
import { resolveDepositStatusEvent, shouldKeepTrackingDeposit } from '../utils/depositStatus'

const POLL_INTERVAL_MS = 10_000

type UseDepositPollingParams = {
  apiClient: ApiClient
}

export const useDepositPolling = ({ apiClient }: UseDepositPollingParams) => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const actorRef = SwapMachineCtx.useActorRef()
  const pollingRef = useRef(false)

  useEffect(() => {
    const snap = actorRef.getSnapshot()

    // Keeps polling past expiry, so a deposit the provider still settles is picked up
    const isDepositTracking =
      snap.context.isDepositFlow &&
      (snap.matches('awaiting_deposit') ||
        snap.matches('deposit_expired') ||
        snap.matches('polling_status'))

    if (!isDepositTracking) {
      pollingRef.current = false
      return
    }

    if (pollingRef.current) return
    pollingRef.current = true

    let stopped = false
    let hasDetectedDeposit = !!snap.context.txHash

    const poll = async () => {
      if (stopped) return

      const quoteId = actorRef.getSnapshot().context.quote?.quoteId
      if (!quoteId) {
        setTimeout(poll, POLL_INTERVAL_MS)
        return
      }

      try {
        const response = (await apiClient.getSwapStatus({ quoteId })) as DepositStatusResponse
        if (stopped) return

        const event = resolveDepositStatusEvent(response, hasDetectedDeposit)

        if (event?.type === 'DEPOSIT_DETECTED') hasDetectedDeposit = true
        if (event) actorRef.send(event)
        if (event?.type === 'STATUS_CONFIRMED' || event?.type === 'STATUS_FAILED') return
      } catch {
        // A transient status failure must not kill a deposit window - retry on the next tick
      }

      const { quote } = actorRef.getSnapshot().context
      if (
        quote &&
        !shouldKeepTrackingDeposit({
          expiresAt: quote.expiresAt,
          hasDetectedDeposit,
          now: Date.now(),
        })
      ) {
        return
      }

      setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()

    return () => {
      stopped = true
      pollingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateValue is the sole trigger; other deps are stable refs or read from snapshot
  }, [stateValue])
}
