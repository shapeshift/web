import type { ProgressProps } from '@chakra-ui/progress'
import axios from 'axios'
import { getConfig } from 'config'
import { useEffect, useMemo, useState } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'
const POLL_INTERVAL_MILLISECONDS = 30_000 // 30 seconds

type ThornodeStreamingSwapResponse = {
  tx_id?: string
  interval?: number
  quantity?: number
  count?: number
  last_height?: number
  trade_target?: string
  deposit?: string
  in?: string
  out?: string
  failed_swaps?: number[]
  failed_swap_reasons?: string[]
}

export const getThorchainStreamingSwap = async (
  sellTxHash: string,
): Promise<ThornodeStreamingSwapResponse | undefined> => {
  const { data: streamingSwapData } = await axios.get<ThornodeStreamingSwapResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/swap/streaming/${sellTxHash}`,
  )

  if (!streamingSwapData) return

  return streamingSwapData
}

type FailedSwap = {
  reason: string
  swapIndex: number
}

export const useThorStreamingProgress = (
  txHash: string | undefined,
  isThorTrade: boolean,
): {
  progressProps: ProgressProps
  attemptedSwaps: number
  totalSwaps: number
  failedSwaps: FailedSwap[]
} => {
  const [streamingSwapData, setStreamingSwapData] = useState<
    ThornodeStreamingSwapResponse | undefined
  >()
  const { poll } = usePoll<ThornodeStreamingSwapResponse | undefined>()

  useEffect(() => {
    // exit if not a thor trade
    if (!isThorTrade) return

    // don't start polling until we have a tx
    if (!txHash) return

    poll({
      fn: async () => {
        const updatedStreamingSwapData = await getThorchainStreamingSwap(txHash)
        if (!updatedStreamingSwapData) return
        setStreamingSwapData(updatedStreamingSwapData)
        return updatedStreamingSwapData
      },
      validate: streamingSwapData => {
        if (!streamingSwapData) return false
        return streamingSwapData.count === streamingSwapData.quantity
      },
      interval: POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [isThorTrade, poll, txHash])

  const failedSwaps = useMemo(() => {
    if (!streamingSwapData) return []
    const { failed_swap_reasons: failedSwapReasons, failed_swaps: failedSwaps } = streamingSwapData
    return failedSwapReasons?.map((reason, i) => ({ reason, swapIndex: failedSwaps![i] })) ?? []
  }, [streamingSwapData])

  if (!streamingSwapData)
    return {
      progressProps: {
        isIndeterminate: true,
      },
      attemptedSwaps: 0,
      totalSwaps: 0,
      failedSwaps,
    }

  const { quantity, count } = streamingSwapData

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
    attemptedSwaps: count ?? 0,
    totalSwaps: quantity ?? 0,
    failedSwaps,
  }
}
