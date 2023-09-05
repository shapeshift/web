import type { ProgressProps } from '@chakra-ui/progress'
import axios from 'axios'
import { getConfig } from 'config'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePoll } from 'hooks/usePoll/usePoll'

import type { ThornodeStreamingSwapResponse, ThornodeStreamingSwapResponseSuccess } from './types'
const POLL_INTERVAL_MILLISECONDS = 30_000 // 30 seconds

export const getThorchainStreamingSwap = async (
  sellTxHash: string,
): Promise<ThornodeStreamingSwapResponseSuccess | undefined> => {
  const thorTxHash = sellTxHash.replace(/^0x/, '')
  const { data: streamingSwapData } = await axios.get<ThornodeStreamingSwapResponse>(
    `${getConfig().REACT_APP_THORCHAIN_NODE_URL}/lcd/thorchain/swap/streaming/${thorTxHash}`,
  )

  if (!streamingSwapData) return
  if ('error' in streamingSwapData) {
    console.error('failed to fetch streaming swap data', streamingSwapData.error)
    return
  }

  return streamingSwapData
}

type FailedSwap = {
  reason: string
  swapIndex: number
}

export const useThorStreamingProgress = (
  txHash: string | undefined,
  isThorStreamingSwap: boolean,
): {
  progressProps: ProgressProps
  attemptedSwapCount: number
  totalSwapCount: number
  failedSwaps: FailedSwap[]
} => {
  // a ref is used to allow updating and reading state without creating a dependency cycle
  const streamingSwapDataRef = useRef<ThornodeStreamingSwapResponseSuccess>()
  const [streamingSwapData, setStreamingSwapData] = useState<ThornodeStreamingSwapResponseSuccess>()
  const { poll } = usePoll<ThornodeStreamingSwapResponseSuccess | undefined>()

  useEffect(() => {
    // exit if not a thor trade
    if (!isThorStreamingSwap) return

    // don't start polling until we have a tx
    if (!txHash) return

    poll({
      fn: async () => {
        const updatedStreamingSwapData = await getThorchainStreamingSwap(txHash)

        // no payload at all - must be a failed request - return
        if (!updatedStreamingSwapData) return

        // no valid data received so far and no valid data to update - return
        if (!streamingSwapDataRef.current?.quantity && !updatedStreamingSwapData.quantity) return

        // thornode returns a default empty response once the streaming is complete
        // set the count to the quantity so UI can display completed status
        if (streamingSwapDataRef.current?.quantity && !updatedStreamingSwapData.quantity) {
          const completedStreamingSwapData = {
            ...streamingSwapDataRef.current,
            count: streamingSwapDataRef.current.quantity,
          }
          streamingSwapDataRef.current = completedStreamingSwapData
          setStreamingSwapData(completedStreamingSwapData)
          return completedStreamingSwapData
        }

        // data to update - update
        streamingSwapDataRef.current = updatedStreamingSwapData
        setStreamingSwapData(updatedStreamingSwapData)
        return updatedStreamingSwapData
      },
      validate: streamingSwapData => {
        if (!streamingSwapData || !streamingSwapData.quantity) return false
        return streamingSwapData.count === streamingSwapData.quantity
      },
      interval: POLL_INTERVAL_MILLISECONDS,
      maxAttempts: Infinity,
    })
  }, [isThorStreamingSwap, poll, txHash])

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
      attemptedSwapCount: 0,
      totalSwapCount: 0,
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
    attemptedSwapCount: count ?? 0,
    totalSwapCount: quantity ?? 0,
    failedSwaps,
  }
}
