import { useEffect, useMemo, useState } from 'react'

import type { Asset, AssetId } from '../types'

const ASSET_DATA_URL = 'https://app.shapeshift.com/generated/generatedAssetData.json'

// Routing is hash based, so params can land either side of it depending on how the url was typed
export const getDemoSearchParams = (): URLSearchParams => {
  const params = new URLSearchParams(window.location.search)

  const hashQueryIndex = window.location.hash.indexOf('?')
  if (hashQueryIndex !== -1) {
    new URLSearchParams(window.location.hash.slice(hashQueryIndex + 1)).forEach((value, key) =>
      params.set(key, value),
    )
  }

  return params
}

// Integrator props are driven off the query string so the demo can exercise them without a rebuild
export const useIntegratorParams = () => {
  const params = useMemo(getDemoSearchParams, [])

  const sellAssetId = params.get('sellAssetId')
  const buyAssetId = params.get('buyAssetId')

  const [assetsById, setAssetsById] = useState<Record<AssetId, Asset>>({})

  useEffect(() => {
    if (!sellAssetId && !buyAssetId) return

    fetch(ASSET_DATA_URL)
      .then(response => response.json())
      .then(({ byId }: { byId: Record<AssetId, Asset> }) => setAssetsById(byId))
      .catch(error => console.error('Failed to resolve demo assets', error))
  }, [sellAssetId, buyAssetId])

  return useMemo(() => {
    const defaultSellAsset = sellAssetId ? assetsById[sellAssetId] : undefined
    const defaultBuyAsset = buyAssetId ? assetsById[buyAssetId] : undefined

    return {
      // The widget syncs its defaults once on mount, so requested assets have to be in hand before
      // it renders - otherwise the fetch lands too late and the built-in defaults stick
      isReady: (!sellAssetId || !!defaultSellAsset) && (!buyAssetId || !!defaultBuyAsset),
      props: {
        defaultSellAsset,
        defaultBuyAsset,
        defaultBuyAmountCryptoBaseUnit: params.get('buyAmount') ?? undefined,
        isBuyAmountLocked: params.get('lockBuyAmount') === 'true',
        defaultReceiveAddress: params.get('receiveAddress') ?? undefined,
        isReceiveAddressLocked: params.get('lockReceiveAddress') === 'true',
        isBuyAssetLocked: params.get('lockBuyAsset') === 'true',
      },
    }
  }, [params, assetsById, sellAssetId, buyAssetId])
}
