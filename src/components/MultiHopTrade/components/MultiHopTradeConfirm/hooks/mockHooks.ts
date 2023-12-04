import { useCallback, useEffect } from 'react'
import { sleep } from 'lib/poll/poll'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import {
  type StreamingSwapFailedSwap,
  type StreamingSwapMetadata,
  TransactionExecutionState,
} from 'state/slices/tradeQuoteSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

// toggle this to force the mock hooks to always fail - useful for testing failure modes
const MOCK_FAIL_APPROVAL = false
const MOCK_FAIL_SWAP = false
const MOCK_FAIL_STREAMING_SWAP = true

const DEFAULT_STREAMING_SWAP_METADATA: StreamingSwapMetadata = {
  attemptedSwapCount: 0,
  totalSwapCount: 0,
  failedSwaps: [],
}

// TODO: remove me
export const useMockAllowanceApproval = (
  _tradeQuoteStep: TradeQuoteStep,
  hopIndex: number,
  _isExactAllowance: boolean,
) => {
  const dispatch = useAppDispatch()

  const executeAllowanceApproval = useCallback(() => {
    dispatch(tradeQuoteSlice.actions.setApprovalTxPending({ hopIndex }))

    const promise = new Promise((resolve, _reject) => {
      setTimeout(() => {
        dispatch(
          tradeQuoteSlice.actions.setApprovalTxHash({ hopIndex, txHash: 'approval_tx_hash' }),
        )
      }, 2000)

      setTimeout(() => {
        const finalStatus = MOCK_FAIL_APPROVAL
          ? TransactionExecutionState.Failed
          : TransactionExecutionState.Complete

        MOCK_FAIL_APPROVAL
          ? dispatch(tradeQuoteSlice.actions.setApprovalTxFailed({ hopIndex }))
          : dispatch(tradeQuoteSlice.actions.setApprovalTxComplete({ hopIndex }))

        resolve(finalStatus)
      }, 5000)
    })

    return promise
  }, [dispatch, hopIndex])

  return {
    executeAllowanceApproval,
    approvalNetworkFeeCryptoBaseUnit: '12345678901234',
  }
}

// TODO: remove me
export const useMockTradeExecution = (hopIndex: number) => {
  const dispatch = useAppDispatch()

  const executeTrade = useCallback(() => {
    const promise = new Promise((resolve, _reject) => {
      dispatch(tradeQuoteSlice.actions.setSwapTxPending({ hopIndex }))

      setTimeout(() => {
        dispatch(
          tradeQuoteSlice.actions.setSwapSellTxHash({ hopIndex, sellTxHash: 'swap_sell_tx_hash' }),
        )
      }, 2000)

      setTimeout(() => {
        const finalStatus = MOCK_FAIL_SWAP
          ? TransactionExecutionState.Failed
          : TransactionExecutionState.Complete

        MOCK_FAIL_SWAP
          ? dispatch(tradeQuoteSlice.actions.setSwapTxFailed({ hopIndex }))
          : dispatch(tradeQuoteSlice.actions.setSwapTxComplete({ hopIndex }))
        resolve(finalStatus)
      }, 15000)
    })

    return promise
  }, [dispatch, hopIndex])

  return {
    executeTrade,
  }
}

// TODO: remove me
export const useMockThorStreamingProgress = (
  hopIndex: number,
): {
  isComplete: boolean
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
} => {
  const dispatch = useAppDispatch()
  const {
    swap: { sellTxHash, streamingSwap: streamingSwapMeta },
  } = useAppSelector(selectHopExecutionMetadata)[hopIndex]

  const streamingSwapExecutionStarted = streamingSwapMeta !== undefined

  useEffect(() => {
    if (!sellTxHash || streamingSwapExecutionStarted) return
    ;(async () => {
      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 0,
            failedSwaps: [],
          },
        }),
      )

      await sleep(1500)

      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 1,
            failedSwaps: [],
          },
        }),
      )

      await sleep(1500)

      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 2,
            failedSwaps: MOCK_FAIL_STREAMING_SWAP
              ? [
                  {
                    reason: 'mock reason',
                    swapIndex: 1,
                  },
                ]
              : [],
          },
        }),
      )

      await sleep(1500)

      dispatch(
        tradeQuoteSlice.actions.setStreamingSwapMeta({
          hopIndex,
          streamingSwapMetadata: {
            totalSwapCount: 3,
            attemptedSwapCount: 3,
            failedSwaps: MOCK_FAIL_STREAMING_SWAP
              ? [
                  {
                    reason: 'mock reason',
                    swapIndex: 1,
                  },
                ]
              : [],
          },
        }),
      )
    })()
  }, [dispatch, hopIndex, sellTxHash, streamingSwapExecutionStarted])

  const isComplete =
    streamingSwapMeta !== undefined &&
    streamingSwapMeta.attemptedSwapCount === streamingSwapMeta.totalSwapCount

  return {
    ...(streamingSwapMeta ?? DEFAULT_STREAMING_SWAP_METADATA),
    isComplete,
  }
}
