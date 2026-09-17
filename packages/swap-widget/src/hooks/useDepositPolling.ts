import { useEffect, useRef } from 'react'

import type { ApiClient } from '../api/client'
import { ApiError } from '../api/client'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { SwapStatusResponse } from '../utils/swapStatus'
import { resolveDepositStatusEvent, shouldKeepTrackingDeposit } from '../utils/swapStatus'

const POLL_INTERVAL_MS = 10_000

const isQuoteNotFound = (error: unknown): boolean =>
  error instanceof ApiError && error.code === 'QUOTE_NOT_FOUND'

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
    let timer: ReturnType<typeof setTimeout> | undefined
    const depositObservedAt = snap.context.depositObservedAt ?? undefined

    const poll = async () => {
      if (stopped) return

      const quoteId = actorRef.getSnapshot().context.quote?.quoteId

      if (quoteId) {
        try {
          const response = (await apiClient.getSwapStatus({ quoteId })) as SwapStatusResponse
          if (stopped) return

          const event = resolveDepositStatusEvent(
            response,
            !!depositObservedAt,
            Date.now(),
            actorRef.getSnapshot().context.swapperTxLink,
          )

          if (event) {
            actorRef.send(event)
            // Every other event leaves this state, and the state change restarts polling
            if (event.type !== 'SWAPPER_TX_LINK_UPDATED') return
          }
        } catch (error) {
          if (stopped) return

          // Quote gone from the api: a funded deposit may still settle, an unfunded address must not be paid
          if (isQuoteNotFound(error)) {
            actorRef.send(
              depositObservedAt ? { type: 'TRACKING_TIMEOUT' } : { type: 'DEPOSIT_EXPIRED' },
            )
            return
          }

          // A transient status failure must not kill a deposit window - retry on the next tick
        }
      }

      const { quote } = actorRef.getSnapshot().context
      if (
        quote &&
        !shouldKeepTrackingDeposit({
          quoteDeadline: quote.expiresAt,
          depositObservedAt,
          now: Date.now(),
        })
      ) {
        // Only polling_status handles this - the expired screen already offers a way forward
        actorRef.send({ type: 'TRACKING_TIMEOUT' })
        return
      }

      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()

    return () => {
      stopped = true
      pollingRef.current = false
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateValue is the sole trigger; other deps are stable refs or read from snapshot
  }, [stateValue])
}
