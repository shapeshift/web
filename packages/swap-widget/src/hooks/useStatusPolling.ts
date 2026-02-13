import { useEffect, useRef } from 'react'

import type { SwapMachineContext, SwapMachineEvent, SwapStateMatches } from '../machines/types'
import type { CheckStatusParams } from '../services/transactionStatus'
import { checkTransactionStatus } from '../services/transactionStatus'
import { getEvmNetworkId } from '../types'

const POLL_INTERVAL_MS = 5000

type UseStatusPollingParams = {
  stateValue: unknown
  stateMatches: SwapStateMatches
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  solanaConnection: unknown
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  refetchSellBalance?: () => void
  refetchBuyBalance?: () => void
}

export const useStatusPolling = ({
  stateValue,
  stateMatches,
  context,
  send,
  solanaConnection,
  onSwapSuccess,
  onSwapError,
  refetchSellBalance,
  refetchBuyBalance,
}: UseStatusPollingParams) => {
  const pollingRef = useRef(false)
  useEffect(() => {
    if (!stateMatches('polling_status')) {
      pollingRef.current = false
      return
    }
    if (pollingRef.current) return
    pollingRef.current = true

    let stopped = false

    const poll = async () => {
      if (stopped || !context.txHash) return

      try {
        let statusParams: CheckStatusParams

        if (context.isSellAssetEvm) {
          statusParams = {
            txHash: context.txHash,
            chainType: 'evm',
            chainId: getEvmNetworkId(context.sellAsset.chainId),
          }
        } else if (context.isSellAssetUtxo) {
          statusParams = {
            txHash: context.txHash,
            chainType: 'utxo',
          }
        } else if (context.isSellAssetSolana) {
          statusParams = {
            txHash: context.txHash,
            chainType: 'solana',
            connection: solanaConnection as CheckStatusParams['connection'],
          }
        } else {
          send({ type: 'STATUS_CONFIRMED' })
          return
        }

        const result = await checkTransactionStatus(statusParams)

        if (stopped) return

        if (result.status === 'confirmed') {
          send({ type: 'STATUS_CONFIRMED' })
          return
        }

        if (result.status === 'failed') {
          send({ type: 'STATUS_FAILED', error: result.error ?? 'Transaction failed' })
          return
        }

        setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        if (stopped) return
        const errorMessage = err instanceof Error ? err.message : 'Unknown polling error'
        send({ type: 'STATUS_FAILED', error: errorMessage })
      }
    }

    poll()

    return () => {
      stopped = true
      pollingRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue])

  const completionRef = useRef(false)
  useEffect(() => {
    if (!stateMatches('complete')) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue])

  const errorRef = useRef(false)
  useEffect(() => {
    if (!stateMatches('error')) {
      errorRef.current = false
      return
    }
    if (errorRef.current) return
    errorRef.current = true

    onSwapError?.(new Error(context.error ?? 'Unknown error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue])
}
