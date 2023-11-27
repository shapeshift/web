import type { ProgressProps } from '@chakra-ui/react'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useState } from 'react'
import type { FailedSwap } from 'components/MultiHopTrade/hooks/useThorStreamingProgress/useThorStreamingProgress'
import { sleep } from 'lib/poll/poll'
import type { TradeQuoteStep } from 'lib/swapper/types'

// toggle this to force the mock hooks to always fail - useful for testing failure modes
const MOCK_FAIL_APPROVAL = true
const MOCK_FAIL_SWAP = false
const MOCK_FAIL_STREAMING_SWAP = false

// TODO: remove me
export const useMockAllowanceApproval = (
  _tradeQuoteStep: TradeQuoteStep,
  _isFirstHop: boolean,
  _isExactAllowance: boolean,
) => {
  const [approvalTxId, setApprovalTxId] = useState<string>()
  const [approvalTxStatus, setApprovalTxStatus] = useState<TxStatus>(TxStatus.Unknown)
  const executeAllowanceApproval = useCallback(() => {
    setApprovalTxStatus(TxStatus.Pending)
    const promise = new Promise((resolve, _reject) => {
      setTimeout(() => setApprovalTxId('0x12345678901234567890'), 2000)
      setTimeout(() => {
        const finalStatus = MOCK_FAIL_APPROVAL ? TxStatus.Failed : TxStatus.Confirmed
        setApprovalTxStatus(finalStatus)
        resolve(finalStatus)
      }, 5000)
    })

    return promise
  }, [])

  return {
    wasApprovalNeeded: true, // the original value of isApprovalNeeded, used for initial UI rendering
    isApprovalNeeded: true,
    executeAllowanceApproval,
    approvalTxId,
    approvalTxStatus,
    approvalNetworkFeeCryptoBaseUnit: '12345678901234',
  }
}

// TODO: remove me
export const useMockTradeExecution = () => {
  const [tradeStatus, setTradeStatus] = useState(TxStatus.Unknown)
  const [sellTxHash, setSellTxHash] = useState<string>()
  const executeTrade = useCallback(() => {
    const promise = new Promise((resolve, _reject) => {
      setTradeStatus(TxStatus.Pending)
      setTimeout(() => setSellTxHash('0x12345678901234567890'), 2000)
      setTimeout(() => {
        const finalStatus = MOCK_FAIL_SWAP ? TxStatus.Failed : TxStatus.Confirmed
        setTradeStatus(finalStatus)
        resolve(finalStatus)
      }, 15000)
    })

    return promise
  }, [])

  return {
    buyTxHash: undefined,
    sellTxHash,
    tradeStatus,
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
