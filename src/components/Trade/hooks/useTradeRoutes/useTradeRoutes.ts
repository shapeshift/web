import { AssetId, chainIdToFeeAssetId } from '@shapeshiftoss/caip'
import { Asset, KnownChainIds } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField, TradeAsset, TradeRoutePaths, TradeState } from 'components/Trade/types'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetById, selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useSwapper } from '../useSwapper/useSwapper'
import { AssetBalance } from 'pages/Assets/AssetCards/AssetBalance'

export const useTradeRoutes = (
  routeBuyAssetId?: AssetId,
): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<KnownChainIds>>()
  const { updateQuote, getDefaultPair, getSupportedBuyAssetsFromSellAsset, swapperManager } = useSwapper()
  const buyTradeAsset = getValues('buyAsset')
  const [sellTradeAsset] = useWatch({
    name: ['sellAsset'],
  }) as [
      TradeAsset | undefined,
    ]
  console.log("WAT", sellTradeAsset?.asset)
  const feeAssetId = chainIdToFeeAssetId(sellTradeAsset?.asset?.chainId ?? 'eip155:1')
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  console.log('FEEE', feeAsset)
  const assets = useSelector(selectAssets)
  const {
    state: { wallet },
  } = useWallet()

  const setDefaultAssets = useCallback(async () => {
    // wait for assets to be loaded
    if (isEmpty(assets) || !feeAsset) return

    try {
      const [defaultSellAssetId, defaultBuyAssetId] = getDefaultPair()
      const sellAsset = assets[defaultSellAssetId]

      const preBuyAssetToCheckId = routeBuyAssetId ?? defaultBuyAssetId

      // make sure the same buy and sell assets arent selected
      const buyAssetToCheckId =
        preBuyAssetToCheckId === defaultSellAssetId ? defaultBuyAssetId : preBuyAssetToCheckId

      const bestSwapper = await swapperManager.getBestSwapper({
        buyAssetId: buyAssetToCheckId,
        sellAssetId: defaultSellAssetId,
      })

      // TODO update swapper to have an official way to validate a pair is supported.
      // This works for now
      const isSupportedPair = await (async () => {
        try {
          if (bestSwapper) {
            await bestSwapper.getUsdRate({ ...assets[buyAssetToCheckId] })
            return true
          }
        } catch (e) { }
        return false
      })()

      const buyAssetId = isSupportedPair ? buyAssetToCheckId : defaultBuyAssetId

      const buyAsset = assets[buyAssetId]

      if (sellAsset && buyAsset) {
        setValue('buyAsset.asset', buyAsset)
        setValue('sellAsset.asset', sellAsset)
        await updateQuote({
          forceQuote: true,
          amount: '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [assets, feeAsset, getDefaultPair, routeBuyAssetId, setValue, swapperManager, updateQuote])

  useEffect(() => {
    setDefaultAssets()
  }, [assets, routeBuyAssetId, wallet])

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        const previousSellAsset = { ...getValues('sellAsset') }
        const previousBuyAsset = { ...getValues('buyAsset') }

        // Handle scenario where same asset is selected for buy and sell
        if (asset.assetId === previousBuyAsset?.asset?.assetId) {
          setValue('sellAsset.asset', asset)
          setValue('buyAsset.asset', previousSellAsset.asset)
        } else {
          setValue('sellAsset.asset', asset)
          setValue('buyAsset.asset', buyTradeAsset?.asset)
        }

        if (sellTradeAsset?.asset && buyTradeAsset?.asset) {
          const assetArray = Object.values(assets)
          const buyAssets = getSupportedBuyAssetsFromSellAsset(assetArray)
          let buyAsset = buyTradeAsset.asset
          let updatedFeeAsset = feeAsset

          // Make sure buy asset is valid
          if (buyAssets && !buyAssets?.includes(buyAsset)) {
            const feeAssetId = chainIdToFeeAssetId(sellTradeAsset?.asset?.chainId ?? 'eip155:1')
            for (const asset of buyAssets) {
              if (asset.assetId !== sellTradeAsset?.asset?.assetId) {
                setValue('buyAsset.asset', asset)
                buyAsset = asset
              }
              if (asset.assetId === feeAssetId) {
                updatedFeeAsset = asset
              }
            }
          }

          await updateQuote({
            forceQuote: true,
            amount: bnOrZero(sellTradeAsset.amount).toString(),
            sellAsset: asset,
            buyAsset,
            feeAsset: updatedFeeAsset,
            action: TradeAmountInputField.SELL,
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [
      getValues,
      sellTradeAsset?.asset,
      sellTradeAsset?.amount,
      buyTradeAsset?.asset,
      setValue,
      updateQuote,
      feeAsset,
      history,
    ],
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        const previousSellAsset = { ...getValues('sellAsset') }
        const previousBuyAsset = { ...getValues('buyAsset') }

        // Handle scenario where same asset is selected for buy and sell
        if (asset.assetId === previousSellAsset?.asset?.assetId) {
          setValue('buyAsset.asset', asset)
          setValue('sellAsset.asset', previousBuyAsset.asset)
        } else {
          setValue('buyAsset.asset', asset)
          setValue('sellAsset.asset', sellTradeAsset?.asset)
        }

        if (sellTradeAsset?.asset && buyTradeAsset?.asset) {
          console.log("UPDATER", sellTradeAsset.asset)
          await updateQuote({
            forceQuote: true,
            amount: bnOrZero(buyTradeAsset.amount).toString(),
            sellAsset: sellTradeAsset.asset,
            buyAsset: asset,
            feeAsset,
            action: TradeAmountInputField.SELL,
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        history.push(TradeRoutePaths.Input)
      }
    },
    [getValues, buyTradeAsset, sellTradeAsset, updateQuote, feeAsset, setValue, history],
  )

  return { handleSellClick, handleBuyClick }
}
