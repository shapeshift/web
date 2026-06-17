import { useAppKit } from '@reown/appkit/react'
import { useCallback } from 'react'

import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { Asset, TradeRate } from '../types'
import { parseAmount } from '../types'
import { cryptoToFiatInput, fiatToCrypto } from '../utils/fiatConversion'
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
    if (snap.context.isSellAmountFiat) {
      actorRef.send({
        type: 'SET_SELL_FIAT_MODE',
        isFiat: true,
        fiatValue: '',
        amount: '',
        amountBaseUnit: undefined,
      })
    } else {
      actorRef.send({ type: 'SET_SELL_AMOUNT', amount: '', amountBaseUnit: undefined })
    }
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
        actorRef.send({
          type: 'SET_SELL_FIAT_MODE',
          isFiat: true,
          fiatValue: value,
          amount,
          amountBaseUnit,
        })
        return
      }
      const baseUnit = value ? parseAmount(value, sellAsset.precision) : undefined
      actorRef.send({ type: 'SET_SELL_AMOUNT', amount: value, amountBaseUnit: baseUnit })
    },
    [actorRef],
  )

  const handleToggleSellFiat = useCallback(
    (sellAssetUsdPrice?: string) => {
      if (!sellAssetUsdPrice) return
      const snap = actorRef.getSnapshot()
      const { sellAmount, sellAmountBaseUnit, sellAsset, isSellAmountFiat } = snap.context
      if (isSellAmountFiat) {
        actorRef.send({
          type: 'SET_SELL_FIAT_MODE',
          isFiat: false,
          fiatValue: '',
          amount: sellAmount,
          amountBaseUnit: sellAmountBaseUnit,
        })
        return
      }
      const fiatValue = cryptoToFiatInput(sellAmountBaseUnit, sellAssetUsdPrice, sellAsset.precision)
      actorRef.send({
        type: 'SET_SELL_FIAT_MODE',
        isFiat: true,
        fiatValue,
        amount: sellAmount,
        amountBaseUnit: sellAmountBaseUnit,
      })
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

  const handleButtonClick = useCallback(() => {
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
      return
    }
    if (
      !snap.context.isSellAssetEvm &&
      !snap.context.isSellAssetUtxo &&
      !snap.context.isSellAssetSolana
    ) {
      if (!allowShapeshiftRedirect) return
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
      return
    }
    actorRef.send({ type: 'FETCH_QUOTE' })
  }, [
    actorRef,
    bitcoin.isConnected,
    solana.isConnected,
    evm.isConnected,
    openAppKit,
    partnerCode,
    allowShapeshiftRedirect,
  ])

  return {
    handleSwapTokens,
    handleSellAssetSelect,
    handleBuyAssetSelect,
    handleSellAmountChange,
    handleToggleSellFiat,
    handleSelectRate,
    handleSlippageChange,
    redirectToShapeShift,
    handleButtonClick,
  }
}
