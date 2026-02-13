import { useEffect, useRef } from 'react'

import type { ApiClient } from '../api/client'
import type { SwapMachineContext, SwapMachineEvent, SwapStateMatches } from '../machines/types'
import type { TradeRate } from '../types'

type BalanceData =
  | {
      balance: string
      balanceFormatted: string
    }
  | undefined

type UseSwapQuotingParams = {
  stateValue: unknown
  stateMatches: SwapStateMatches
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  apiClient: ApiClient
  rates: TradeRate[] | undefined
  sellAssetBalance: BalanceData
  walletAddress: string | undefined
  bitcoinAddress: string | undefined
  solanaAddress: string | undefined
  effectiveReceiveAddress: string
}

export const useSwapQuoting = ({
  stateValue,
  stateMatches,
  context,
  send,
  apiClient,
  rates,
  sellAssetBalance,
  walletAddress,
  bitcoinAddress,
  solanaAddress,
  effectiveReceiveAddress,
}: UseSwapQuotingParams) => {
  const quotingRef = useRef(false)

  useEffect(() => {
    if (!stateMatches('quoting') || quotingRef.current) return
    quotingRef.current = true

    const fetchQuote = async () => {
      try {
        if (sellAssetBalance?.balance && context.sellAmountBaseUnit) {
          const balanceBigInt = BigInt(sellAssetBalance.balance)
          const amountBigInt = BigInt(context.sellAmountBaseUnit)
          if (amountBigInt > balanceBigInt) {
            send({ type: 'QUOTE_ERROR', error: 'Insufficient balance' })
            return
          }
        }

        const slippageDecimal = (parseFloat(context.slippage) / 100).toString()
        const rateToUse = context.selectedRate ?? rates?.[0]
        if (!rateToUse || !context.sellAmountBaseUnit) {
          send({ type: 'QUOTE_ERROR', error: 'No rate or amount available' })
          return
        }

        const sendAddress = context.isSellAssetEvm
          ? walletAddress
          : context.isSellAssetUtxo
          ? bitcoinAddress
          : solanaAddress

        if (!sendAddress) {
          send({ type: 'QUOTE_ERROR', error: 'No wallet address available' })
          return
        }

        const receiveAddr = effectiveReceiveAddress || sendAddress

        const response = await apiClient.getQuote({
          sellAssetId: context.sellAsset.assetId,
          buyAssetId: context.buyAsset.assetId,
          sellAmountCryptoBaseUnit: context.sellAmountBaseUnit,
          sendAddress,
          receiveAddress: receiveAddr,
          swapperName: rateToUse.swapperName,
          slippageTolerancePercentageDecimal: slippageDecimal,
        })

        send({ type: 'QUOTE_SUCCESS', quote: response })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get quote'
        send({ type: 'QUOTE_ERROR', error: errorMessage })
      } finally {
        quotingRef.current = false
      }
    }

    fetchQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateValue])
}
