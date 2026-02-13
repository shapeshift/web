import { useCallback } from 'react'

import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'
import type { Asset, TradeRate } from '../types'
import { parseAmount } from '../types'

type UseSwapHandlersParams = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  walletClient: unknown
  isBitcoinConnected: boolean
  isSolanaConnected: boolean
  onConnectWallet?: () => void
  onAssetSelect?: (type: 'sell' | 'buy', asset: Asset) => void
}

export const useSwapHandlers = ({
  context,
  send,
  walletClient,
  isBitcoinConnected,
  isSolanaConnected,
  onConnectWallet,
  onAssetSelect,
}: UseSwapHandlersParams) => {
  const handleSwapTokens = useCallback(() => {
    const tempSell = context.sellAsset
    const tempBuy = context.buyAsset
    send({ type: 'SET_SELL_ASSET', asset: tempBuy })
    send({ type: 'SET_BUY_ASSET', asset: tempSell })
    send({ type: 'SET_SELL_AMOUNT', amount: '', amountBaseUnit: undefined })
  }, [context.sellAsset, context.buyAsset, send])

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      send({ type: 'SET_SELL_ASSET', asset })
      onAssetSelect?.('sell', asset)
    },
    [send, onAssetSelect],
  )

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      send({ type: 'SET_BUY_ASSET', asset })
      onAssetSelect?.('buy', asset)
    },
    [send, onAssetSelect],
  )

  const handleSellAmountChange = useCallback(
    (value: string) => {
      const baseUnit = value ? parseAmount(value, context.sellAsset.precision) : undefined
      send({ type: 'SET_SELL_AMOUNT', amount: value, amountBaseUnit: baseUnit })
    },
    [send, context.sellAsset.precision],
  )

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      send({ type: 'SELECT_RATE', rate })
    },
    [send],
  )

  const handleSlippageChange = useCallback(
    (value: string) => {
      send({ type: 'SET_SLIPPAGE', slippage: value })
    },
    [send],
  )

  const redirectToShapeShift = useCallback(() => {
    const params = new URLSearchParams({
      sellAssetId: context.sellAsset.assetId,
      buyAssetId: context.buyAsset.assetId,
      sellAmount: context.sellAmount,
    })
    window.open(
      `https://app.shapeshift.com/trade?${params.toString()}`,
      '_blank',
      'noopener,noreferrer',
    )
  }, [context.sellAsset.assetId, context.buyAsset.assetId, context.sellAmount])

  const handleButtonClick = useCallback(() => {
    if (context.isSellAssetUtxo && !isBitcoinConnected) {
      return
    }
    if (context.isSellAssetSolana && !isSolanaConnected) {
      return
    }
    if (!walletClient && context.isSellAssetEvm && onConnectWallet) {
      onConnectWallet()
      return
    }
    if (!context.isSellAssetEvm && !context.isSellAssetUtxo && !context.isSellAssetSolana) {
      redirectToShapeShift()
      return
    }
    send({ type: 'FETCH_QUOTE' })
  }, [
    context.isSellAssetUtxo,
    context.isSellAssetSolana,
    context.isSellAssetEvm,
    isBitcoinConnected,
    isSolanaConnected,
    walletClient,
    onConnectWallet,
    redirectToShapeShift,
    send,
  ])

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
