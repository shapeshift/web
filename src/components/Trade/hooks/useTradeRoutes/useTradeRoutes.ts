import { AssetId } from '@shapeshiftoss/caip'
import { Asset, ChainTypes } from '@shapeshiftoss/types'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { TradeAmountInputField } from 'components/Trade/types'
import { selectAssets } from 'state/slices/selectors'

import { TradeState } from '../../Trade'
import { useSwapper } from '../useSwapper/useSwapper'

const ETHEREUM_CAIP19 = 'eip155:1/slip44:60'

export const useTradeRoutes = (
  defaultBuyAssetId?: AssetId,
): {
  handleSellClick: (asset: Asset) => Promise<void>
  handleBuyClick: (asset: Asset) => Promise<void>
} => {
  const history = useHistory()
  const { getValues, setValue } = useFormContext<TradeState<ChainTypes>>()
  const { updateQuote, getDefaultPair } = useSwapper()
  const buyAsset = getValues('buyAsset')
  const sellAsset = getValues('sellAsset')
  const assets = useSelector(selectAssets)
  const feeAsset = assets[ETHEREUM_CAIP19]

  const setDefaultAssets = useCallback(async () => {
    // wait for assets to be loaded
    if (isEmpty(assets) || !feeAsset) return

    // TODO: Create a real whitelist when we support more chains
    const shouldUseDefaultAsset = () => {
      return (
        defaultBuyAssetId &&
        assets[defaultBuyAssetId]?.chain === ChainTypes.Ethereum &&
        assets[defaultBuyAssetId]?.assetId !== ETHEREUM_CAIP19
      )
    }

    try {
      const [sellAssetId, buyAssetId] = getDefaultPair()
      const sellAsset = assets[sellAssetId]

      const buyAsset =
        defaultBuyAssetId && shouldUseDefaultAsset()
          ? assets[defaultBuyAssetId]
          : assets[buyAssetId]

      if (sellAsset && buyAsset) {
        setValue('sellAsset.currency', sellAsset)
        setValue('buyAsset.currency', buyAsset)
        updateQuote({
          amount: '0',
          sellAsset: { currency: sellAsset },
          buyAsset: { currency: buyAsset },
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      }
    } catch (e) {
      console.warn(e)
    }
  }, [assets, setValue, feeAsset, updateQuote, getDefaultPair, defaultBuyAssetId])

  useEffect(() => {
    setDefaultAssets()
  }, [assets, feeAsset]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSellClick = useCallback(
    async (asset: Asset) => {
      try {
        if (buyAsset.currency && asset.assetId === buyAsset.currency.assetId)
          setValue('buyAsset.currency', sellAsset.currency)
        setValue('sellAsset.currency', asset)
        setValue('buyAsset.amount', '')
        setValue('quote', undefined)
        updateQuote({
          amount: sellAsset.amount ?? '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyAsset, sellAsset, feeAsset, history, setValue, updateQuote],
  )

  const handleBuyClick = useCallback(
    async (asset: Asset) => {
      try {
        if (sellAsset.currency && asset.assetId === sellAsset.currency.assetId)
          setValue('sellAsset.currency', buyAsset.currency)
        setValue('buyAsset.currency', asset)
        setValue('sellAsset.amount', '')
        setValue('quote', undefined)
        updateQuote({
          amount: buyAsset.amount ?? '0',
          sellAsset,
          buyAsset,
          feeAsset,
          action: TradeAmountInputField.SELL,
        })
      } catch (e) {
        console.warn(e)
      } finally {
        history.push('/trade/input')
      }
    },
    [buyAsset, sellAsset, feeAsset, history, setValue, updateQuote],
  )

  return { handleSellClick, handleBuyClick }
}
