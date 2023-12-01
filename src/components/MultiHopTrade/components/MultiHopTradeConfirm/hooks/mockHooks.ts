import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect } from 'react'
import { sleep } from 'lib/poll/poll'
import type { TradeQuoteStep } from 'lib/swapper/types'
import { selectHopExecutionMetadata } from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import type {
  StreamingSwapFailedSwap,
  StreamingSwapMetadata,
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
  hopIndex: number,
): {
  isComplete: boolean
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: StreamingSwapFailedSwap[]
} => {
  const dispatch = useAppDispatch()
  const { swapSellTxHash: sellTxHash, streamingSwap: streamingSwapMeta } = useAppSelector(
    selectHopExecutionMetadata,
  )[hopIndex]

  const streamingSwapExecutionStarted = streamingSwapMeta !== undefined

  useEffect(() => {
    if (!sellTxHash || streamingSwapExecutionStarted) return
    ;(async () => {
      const setStreamingSwapMeta =
        hopIndex === 0
          ? tradeQuoteSlice.actions.setFirstHopStreamingSwapMeta
          : tradeQuoteSlice.actions.setSecondHopStreamingSwapMeta

      dispatch(
        setStreamingSwapMeta({
          totalSwapCount: 3,
          attemptedSwapCount: 0,
          failedSwaps: [],
        }),
      )

      await sleep(1500)

      dispatch(
        setStreamingSwapMeta({
          totalSwapCount: 3,
          attemptedSwapCount: 1,
          failedSwaps: [],
        }),
      )

      await sleep(1500)

      dispatch(
        setStreamingSwapMeta({
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
        }),
      )

      await sleep(1500)

      dispatch(
        setStreamingSwapMeta({
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
