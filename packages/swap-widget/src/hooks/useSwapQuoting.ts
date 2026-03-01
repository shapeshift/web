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

  const { walletAddress, effectiveReceiveAddress, bitcoin, solana } = useSwapWallet()
  const bitcoinAddress = bitcoin.address
  const solanaAddress = solana.address

  const quotingRef = useRef(false)

  useEffect(() => {
    const snap = actorRef.getSnapshot()
    if (!snap.matches('quoting') || quotingRef.current) return
    quotingRef.current = true

    const fetchQuote = async () => {
      try {
        if (sellAssetBalance?.balance && context.sellAmountBaseUnit) {
          const balanceBigInt = BigInt(sellAssetBalance.balance)
          const amountBigInt = BigInt(context.sellAmountBaseUnit)
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
        const rateToUse = context.selectedRate ?? rates?.[0]
        if (!rateToUse || !context.sellAmountBaseUnit) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'No rate or amount available' })
          return
        }

        const sendAddress = context.isSellAssetEvm
          ? walletAddress
          : context.isSellAssetUtxo
          ? bitcoinAddress
          : context.isSellAssetSolana
          ? solanaAddress
          : undefined

        if (!sendAddress) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'No wallet address available' })
          return
        }

        const receiveAddr = effectiveReceiveAddress || sendAddress

        if (!receiveAddr) {
          actorRef.send({ type: 'QUOTE_ERROR', error: 'No receive address available' })
          return
        }

        const response = await apiClient.getQuote({
          sellAssetId: context.sellAsset.assetId,
          buyAssetId: context.buyAsset.assetId,
          sellAmountCryptoBaseUnit: context.sellAmountBaseUnit,
          sendAddress,
          receiveAddress: receiveAddr,
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
