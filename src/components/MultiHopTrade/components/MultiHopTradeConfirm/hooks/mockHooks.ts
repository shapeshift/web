import type { ProgressProps } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useState } from 'react'
import type { FailedSwap } from 'components/MultiHopTrade/hooks/useThorStreamingProgress/useThorStreamingProgress'
import { sleep } from 'lib/poll/poll'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch } from 'state/store'

// toggle this to force the mock hooks to always fail - useful for testing failure modes
const MOCK_FAIL_APPROVAL = false
const MOCK_FAIL_SWAP = false
const MOCK_FAIL_STREAMING_SWAP = false

// TODO: remove me
export const useMockAllowanceApproval = (
  _tradeQuoteStep: TradeQuoteStep,
  isFirstHop: boolean,
  _isExactAllowance: boolean,
) => {
  const dispatch = useAppDispatch()

  const executeAllowanceApproval = useCallback(() => {
    isFirstHop
      ? dispatch(tradeQuoteSlice.actions.setFirstHopApprovalState(TxStatus.Pending))
      : dispatch(tradeQuoteSlice.actions.setSecondHopApprovalState(TxStatus.Pending))

    const promise = new Promise((resolve, _reject) => {
      setTimeout(() => {
        isFirstHop
          ? dispatch(
              tradeQuoteSlice.actions.setFirstHopApprovalTxHash('first_hop_approval_tx_hash'),
            )
          : dispatch(
              tradeQuoteSlice.actions.setSecondHopApprovalTxHash('second_hop_approval_tx_hash'),
            )
      }, 2000)
      setTimeout(() => {
        const finalStatus = MOCK_FAIL_APPROVAL ? TxStatus.Failed : TxStatus.Confirmed

        isFirstHop
          ? dispatch(tradeQuoteSlice.actions.setFirstHopApprovalState(finalStatus))
          : dispatch(tradeQuoteSlice.actions.setSecondHopApprovalState(finalStatus))

        resolve(finalStatus)
      }, 5000)
    })

    return promise
  }, [dispatch, isFirstHop])

  return {
    executeAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit: '12345678901234',
  }
}

// TODO: remove me
export const useMockTradeExecution = (isFirstHop: boolean) => {
  const dispatch = useAppDispatch()

  const executeTrade = useCallback(() => {
    const promise = new Promise((resolve, _reject) => {
      isFirstHop
        ? dispatch(tradeQuoteSlice.actions.setFirstHopSwapState(TxStatus.Pending))
        : dispatch(tradeQuoteSlice.actions.setSecondHopSwapState(TxStatus.Pending))

      setTimeout(() => {
        isFirstHop
          ? dispatch(tradeQuoteSlice.actions.setFirstHopSwapSellTxHash('first_hop_sell_tx_hash'))
          : dispatch(tradeQuoteSlice.actions.setSecondHopSwapSellTxHash('second_hop_sell_tx_hash'))
      }, 2000)
      setTimeout(() => {
        const finalStatus = MOCK_FAIL_SWAP ? TxStatus.Failed : TxStatus.Confirmed
        isFirstHop
          ? dispatch(tradeQuoteSlice.actions.setFirstHopSwapState(finalStatus))
          : dispatch(tradeQuoteSlice.actions.setSecondHopSwapState(finalStatus))
        resolve(finalStatus)
      }, 15000)
    })

    return promise
  }, [dispatch, isFirstHop])

  return {
    executeTrade,
  }
}

// TODO: remove me
export const useMockThorStreamingProgress = (
  txHash: string | undefined,
  _isThorStreamingSwap: boolean,
): {
  progressProps: ProgressProps
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: FailedSwap[]
} => {
  const [failedSwaps, setFailedSwaps] = useState<FailedSwap[]>([])
  const [quantity, setQuantity] = useState<number>(0)
  const [count, setCount] = useState<number>(0)

  useEffect(() => {
    if (!txHash) return
    ;(async () => {
      setQuantity(3)
      await sleep(1500)
      setCount(1)

      // mock the middle swap failing
      await sleep(1500)
      setCount(2)
      MOCK_FAIL_STREAMING_SWAP &&
        // TODO: store this metadata in redux so we can display it in the summary after completion
        setFailedSwaps([
          {
            reason: 'mock reason',
            swapIndex: 1,
          },
        ])

      await sleep(1500)
      setCount(3)
    })()
  }, [txHash])

  const isComplete = count === quantity

  return {
    progressProps: {
      min: 0,
      max: quantity,
      value: count,
      hasStripe: true,
      isAnimated: !isComplete,
      colorScheme: isComplete ? 'green' : 'blue',
    },
    attemptedSwapCount: count ?? 0,
    totalSwapCount: quantity ?? 0,
    failedSwaps,
  }
}
