import { useEffect, useRef } from 'react'

import { SwapMachineCtx } from '../machines/SwapMachineContext'

type UseSwapCallbacksParams = {
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  refetchSellBalance?: () => void
  refetchBuyBalance?: () => void
}

export const useSwapCallbacks = ({
  onSwapSuccess,
  onSwapError,
  refetchSellBalance,
  refetchBuyBalance,
}: UseSwapCallbacksParams) => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const context = SwapMachineCtx.useSelector(s => s.context)
  const actorRef = SwapMachineCtx.useActorRef()

  const completionRef = useRef(false)
  useEffect(() => {
    const snap = actorRef.getSnapshot()

    if (!snap.matches('complete')) {
      completionRef.current = false
      return
    }

    if (completionRef.current) return
    completionRef.current = true

    if (context.txHash) {
      onSwapSuccess?.(context.txHash)
    }

    refetchSellBalance?.()
    refetchBuyBalance?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateValue is the sole trigger; callbacks are stable
  }, [stateValue])

  const errorRef = useRef(false)
  useEffect(() => {
    const snap = actorRef.getSnapshot()

    if (!snap.matches('error')) {
      errorRef.current = false
      return
    }

    if (errorRef.current) return
    errorRef.current = true

    onSwapError?.(new Error(context.error ?? 'Unknown error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateValue is the sole trigger; callbacks are stable
  }, [stateValue])
}
