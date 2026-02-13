import { useCallback } from 'react'

import { useSwapWallet } from '../contexts/SwapWalletContext'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { Asset, TradeRate } from '../types'
import { parseAmount } from '../types'

type UseSwapHandlersParams = {
  onConnectWallet?: () => void
  onAssetSelect?: (type: 'sell' | 'buy', asset: Asset) => void
}

export const useSwapHandlers = ({ onConnectWallet, onAssetSelect }: UseSwapHandlersParams) => {
  const actorRef = SwapMachineCtx.useActorRef()
  const { walletClient, bitcoin, solana } = useSwapWallet()

  const handleSwapTokens = useCallback(() => {
    const snap = actorRef.getSnapshot()
    actorRef.send({ type: 'SET_SELL_ASSET', asset: snap.context.buyAsset })
    actorRef.send({ type: 'SET_BUY_ASSET', asset: snap.context.sellAsset })
    actorRef.send({ type: 'SET_SELL_AMOUNT', amount: '', amountBaseUnit: undefined })
  }, [actorRef])

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      actorRef.send({ type: 'SET_SELL_ASSET', asset })
      onAssetSelect?.('sell', asset)
    },
    [actorRef, onAssetSelect],
  )

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      actorRef.send({ type: 'SET_BUY_ASSET', asset })
      onAssetSelect?.('buy', asset)
    },
    [actorRef, onAssetSelect],
  )

  const handleSellAmountChange = useCallback(
    (value: string) => {
      const snap = actorRef.getSnapshot()
      const baseUnit = value ? parseAmount(value, snap.context.sellAsset.precision) : undefined
      actorRef.send({ type: 'SET_SELL_AMOUNT', amount: value, amountBaseUnit: baseUnit })
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
    const params = new URLSearchParams({
      sellAssetId: snap.context.sellAsset.assetId,
      buyAssetId: snap.context.buyAsset.assetId,
      sellAmount: snap.context.sellAmount,
    })
    window.open(
      `https://app.shapeshift.com/trade?${params.toString()}`,
      '_blank',
      'noopener,noreferrer',
    )
  }, [actorRef])

  const handleButtonClick = useCallback(() => {
    const snap = actorRef.getSnapshot()
    if (snap.context.isSellAssetUtxo && !bitcoin.isConnected) {
      return
    }
    if (snap.context.isSellAssetSolana && !solana.isConnected) {
      return
    }
    if (!walletClient && snap.context.isSellAssetEvm && onConnectWallet) {
      onConnectWallet()
      return
    }
    if (
      !snap.context.isSellAssetEvm &&
      !snap.context.isSellAssetUtxo &&
      !snap.context.isSellAssetSolana
    ) {
      const params = new URLSearchParams({
        sellAssetId: snap.context.sellAsset.assetId,
        buyAssetId: snap.context.buyAsset.assetId,
        sellAmount: snap.context.sellAmount,
      })
      window.open(
        `https://app.shapeshift.com/trade?${params.toString()}`,
        '_blank',
        'noopener,noreferrer',
      )
      return
    }
    actorRef.send({ type: 'FETCH_QUOTE' })
  }, [actorRef, bitcoin.isConnected, solana.isConnected, walletClient, onConnectWallet])

  return {
    handleSwapTokens,
    handleSellAssetSelect,
    handleBuyAssetSelect,
    handleSellAmountChange,
    handleSelectRate,
    handleSlippageChange,
    redirectToShapeShift,
    handleButtonClick,
  }
}
