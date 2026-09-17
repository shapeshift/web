import { useEffect, useRef } from 'react'

import type { ApiClient } from '../api/client'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import { isPermanentApiError } from '../utils/apiError'
import type { SwapStatusResponse } from '../utils/swapStatus'
import {
  isWithinSettlementWindow,
  resolveSettledSwapEvent,
  resolveTxLinksEvent,
} from '../utils/swapStatus'

const POLL_INTERVAL_MS = 5000

type UseStatusPollingParams = {
  apiClient: ApiClient
}

export const useStatusPolling = ({ apiClient }: UseStatusPollingParams) => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const actorRef = SwapMachineCtx.useActorRef()
  const pollingRef = useRef(false)

  useEffect(() => {
    const snap = actorRef.getSnapshot()

    // useDepositPolling tracks the deposit flow
    if (!snap.matches('polling_status') || snap.context.isDepositFlow) {
      pollingRef.current = false
      return
    }

    if (pollingRef.current) return
    pollingRef.current = true

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const trackingStartedAt = Date.now()

    const poll = async () => {
      if (stopped) return

      const { quote, txHash } = actorRef.getSnapshot().context
      if (!quote || !txHash) return

      try {
        // The first call binds the hash and starts tracking - later ones read the swapper's status
        const response = (await apiClient.getSwapStatus({
          quoteId: quote.quoteId,
          txHash,
        })) as SwapStatusResponse
        if (stopped) return

        const { txLink, swapperTxLink } = actorRef.getSnapshot().context
        const event =
          resolveSettledSwapEvent(response) ??
          resolveTxLinksEvent(response, { txLink, swapperTxLink })

        if (event) {
          actorRef.send(event)
          // Every other event leaves this state, and the state change restarts polling
          if (event.type !== 'TX_LINKS_UPDATED') return
        }
      } catch (error) {
        if (stopped) return

        // The swap may still settle on chain, so this stops tracking rather than failing it
        if (isPermanentApiError(error)) {
          actorRef.send({ type: 'TRACKING_TIMEOUT' })
          return
        }

        // A transient status failure retries on the next tick
      }

      if (!isWithinSettlementWindow(trackingStartedAt, Date.now())) {
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
