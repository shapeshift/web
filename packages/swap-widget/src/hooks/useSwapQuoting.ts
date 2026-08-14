import { useEffect, useRef } from 'react'

import type { ApiClient } from '../api/client'
import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { TradeRate } from '../types'

type BalanceData =
  | {
      balance: string
      balanceFormatted: string
    }
  | undefined

type UseSwapQuotingParams = {
  apiClient: ApiClient
  rates: TradeRate[] | undefined
  sellAssetBalance: BalanceData
}

export const useSwapQuoting = ({ apiClient, rates, sellAssetBalance }: UseSwapQuotingParams) => {
  const stateValue = SwapMachineCtx.useSelector(s => s.value)
  const context = SwapMachineCtx.useSelector(s => s.context)
  const actorRef = SwapMachineCtx.useActorRef()

  const { sendAddress, receiveAddress } = useSwapWallet()

  const quotingRef = useRef(false)

  useEffect(() => {
    const snap = actorRef.getSnapshot()

    if (!snap.matches('quoting') || quotingRef.current) return

    quotingRef.current = true

    const fetchQuote = async () => {
      try {
        const isExactOutput = !!context.buyAmountBaseUnit
        const rateToUse = context.selectedRate ?? rates?.[0]

        const sellAmountBaseUnit = isExactOutput
          ? rateToUse?.sellAmountCryptoBaseUnit
          : context.sellAmountBaseUnit

        if (sellAssetBalance?.balance && sellAmountBaseUnit) {
          const balanceBigInt = BigInt(sellAssetBalance.balance)
          const amountBigInt = BigInt(sellAmountBaseUnit)

          if (amountBigInt > balanceBigInt) {
            actorRef.send({ type: 'QUOTE_ERROR', error: 'Insufficient balance' })
            return
          }
        }

        const parsedSlippage = parseFloat(context.slippage)
        if (isNaN(parsedSlippage) || parsedSlippage < 0) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'Invalid slippage value' })
          return
        }

        const slippageDecimal = (parsedSlippage / 100).toString()

        const amountBaseUnit = isExactOutput
          ? context.buyAmountBaseUnit
          : context.sellAmountBaseUnit

        if (!rateToUse || !amountBaseUnit) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'No rate or amount available' })
          return
        }

        if (!sendAddress) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'No wallet address available' })
          return
        }

        const resolvedReceiveAddress = receiveAddress || sendAddress

        if (!resolvedReceiveAddress) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'No receive address available' })
          return
        }

        const response = await apiClient.getQuote({
          sellAssetId: context.sellAsset.assetId,
          buyAssetId: context.buyAsset.assetId,
          ...(isExactOutput
            ? { buyAmountCryptoBaseUnit: amountBaseUnit }
            : { sellAmountCryptoBaseUnit: amountBaseUnit }),
          sendAddress,
          receiveAddress: resolvedReceiveAddress,
          swapperName: rateToUse.swapperName,
          slippageTolerancePercentageDecimal: slippageDecimal,
        })

        actorRef.send({ type: 'QUOTE_SUCCESS', quote: response })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get quote'
        actorRef.send({ type: 'QUOTE_ERROR', error: errorMessage })
      } finally {
        quotingRef.current = false
      }
    }

    fetchQuote()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stateValue is the sole trigger; other deps are stable refs read from snapshot
  }, [stateValue])
}
