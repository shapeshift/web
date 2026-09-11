import { useAppKit } from '@reown/appkit/react'
import { useCallback } from 'react'

import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { Asset, TradeRate } from '../types'
import { parseAmount } from '../types'
import { cryptoToFiat, fiatToCrypto } from '../utils/fiatConversion'
import type { InputCtaAction } from '../utils/inputCta'
import { buildShapeShiftTradeUrl } from '../utils/redirect'

type UseSwapHandlersParams = {
  partnerCode?: string
  allowShapeshiftRedirect: boolean
}

export const useSwapHandlers = ({
  partnerCode,
  allowShapeshiftRedirect,
}: UseSwapHandlersParams) => {
  const actorRef = SwapMachineCtx.useActorRef()
  const { evm, bitcoin, solana } = useSwapWallet()
  const { open: openAppKit } = useAppKit()

  const handleSwapTokens = useCallback(() => {
    const snap = actorRef.getSnapshot()
    actorRef.send({ type: 'SET_SELL_ASSET', asset: snap.context.buyAsset })
    actorRef.send({ type: 'SET_BUY_ASSET', asset: snap.context.sellAsset })
    actorRef.send({ type: 'SET_SELL_AMOUNT', amount: '', amountBaseUnit: undefined, fiatValue: '' })
  }, [actorRef])

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      actorRef.send({ type: 'SET_SELL_ASSET', asset })
    },
    [actorRef],
  )

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      actorRef.send({ type: 'SET_BUY_ASSET', asset })
    },
    [actorRef],
  )

  const handleSellAmountChange = useCallback(
    (value: string, sellAssetUsdPrice?: string) => {
      const snap = actorRef.getSnapshot()
      const { sellAsset, isSellAmountFiat } = snap.context

      if (isSellAmountFiat) {
        const { amount, amountBaseUnit } = fiatToCrypto(
          value,
          sellAssetUsdPrice ?? '',
          sellAsset.precision,
        )

        actorRef.send({ type: 'SET_SELL_AMOUNT', amount, amountBaseUnit, fiatValue: value })
        return
      }

      const amountBaseUnit = value ? parseAmount(value, sellAsset.precision) : undefined
      actorRef.send({ type: 'SET_SELL_AMOUNT', amount: value, amountBaseUnit, fiatValue: '' })
    },
    [actorRef],
  )

  const handleBuyAmountChange = useCallback(
    (value: string) => {
      const { buyAsset } = actorRef.getSnapshot().context
      const amountBaseUnit = value ? parseAmount(value, buyAsset.precision) : undefined

      actorRef.send({ type: 'SET_BUY_AMOUNT', amount: value, amountBaseUnit })
    },
    [actorRef],
  )

  const handleToggleSellFiat = useCallback(
    (sellAssetUsdPrice?: string) => {
      if (!sellAssetUsdPrice) return

      const snap = actorRef.getSnapshot()
      const { sellAmount, sellAmountBaseUnit, sellAsset, isSellAmountFiat, buyAmountBaseUnit } =
        snap.context

      if (isSellAmountFiat) {
        actorRef.send({ type: 'SET_SELL_FIAT_MODE', isFiat: false })
        return
      }

      // Seeding a sell amount here would clear the buy amount that's driving the trade
      if (buyAmountBaseUnit) {
        actorRef.send({ type: 'SET_SELL_FIAT_MODE', isFiat: true })
        return
      }

      // Seed the fiat input for display but keep the exact crypto, so a round-trip toggle
      // doesn't snap the amount to its 2-decimal fiat value.
      const fiatValue = cryptoToFiat(sellAmountBaseUnit, sellAssetUsdPrice, sellAsset.precision)

      actorRef.send({
        type: 'SET_SELL_AMOUNT',
        amount: sellAmount,
        amountBaseUnit: sellAmountBaseUnit,
        fiatValue,
      })
      actorRef.send({ type: 'SET_SELL_FIAT_MODE', isFiat: true })
    },
    [actorRef],
  )

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      actorRef.send({ type: 'SELECT_RATE', rate })
    },
    [actorRef],
  )

  const handleSlippageChange = useCallback(
    (value: string) => {
      actorRef.send({ type: 'SET_SLIPPAGE', slippage: value })
    },
    [actorRef],
  )

  const redirectToShapeShift = useCallback(() => {
    const snap = actorRef.getSnapshot()
    const sellAmountBaseUnit = snap.context.sellAmount
      ? parseAmount(snap.context.sellAmount, snap.context.sellAsset.precision)
      : undefined
    const url = buildShapeShiftTradeUrl({
      sellAssetId: snap.context.sellAsset.assetId,
      buyAssetId: snap.context.buyAsset.assetId,
      sellAmountBaseUnit,
      partnerCode,
    })
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [actorRef, partnerCode])

  const handleButtonClick = useCallback(
    (action: InputCtaAction) => {
      if (action === 'deposit') {
        actorRef.send({ type: 'FETCH_QUOTE', isDepositFlow: true })
        return
      }

      if (action === 'quote') {
        actorRef.send({ type: 'FETCH_QUOTE' })
        return
      }

      if (action === 'redirect') {
        if (!allowShapeshiftRedirect) return
        redirectToShapeShift()
        return
      }

      if (action !== 'connect') return

      const snap = actorRef.getSnapshot()
      if (snap.context.isSellAssetUtxo && !bitcoin.isConnected) {
        openAppKit({ namespace: 'bip122' })
        return
      }
      if (snap.context.isSellAssetSolana && !solana.isConnected) {
        openAppKit({ namespace: 'solana' })
        return
      }
      if (snap.context.isSellAssetEvm && !evm.isConnected) {
        openAppKit({ namespace: 'eip155' })
      }
    },
    [
      actorRef,
      bitcoin.isConnected,
      solana.isConnected,
      evm.isConnected,
      openAppKit,
      allowShapeshiftRedirect,
      redirectToShapeShift,
    ],
  )

  return {
    handleSwapTokens,
    handleSellAssetSelect,
    handleBuyAssetSelect,
    handleSellAmountChange,
    handleBuyAmountChange,
    handleToggleSellFiat,
    handleSelectRate,
    handleSlippageChange,
    redirectToShapeShift,
    handleButtonClick,
  }
}
