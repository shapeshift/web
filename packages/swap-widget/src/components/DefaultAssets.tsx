import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { DEFAULT_BUY_ASSET, DEFAULT_SELL_ASSET } from '../constants/defaults'
import { useAssetsById } from '../hooks/useAssets'
import type { Asset, AssetId } from '../types'

type DefaultAssetsProps = {
  sellAsset: Asset | AssetId | undefined
  buyAsset: Asset | AssetId | undefined
  children: (sellAsset: Asset, buyAsset: Asset) => ReactNode
}

const resolveAsset = (
  asset: Asset | AssetId | undefined,
  assetsById: Record<AssetId, Asset>,
  fallback: Asset,
): Asset | undefined => (typeof asset === 'string' ? assetsById[asset] : asset ?? fallback)

// Defaults seed once at mount, so an id has to be looked up in the catalog before the widget renders
const DefaultAssetsById = ({ sellAsset, buyAsset, children }: DefaultAssetsProps) => {
  const { data: assetsById, isFetched, error } = useAssetsById()

  const resolvedSellAsset = resolveAsset(sellAsset, assetsById, DEFAULT_SELL_ASSET)
  const resolvedBuyAsset = resolveAsset(buyAsset, assetsById, DEFAULT_BUY_ASSET)

  useEffect(() => {
    if (!isFetched) return
    if (error) console.error('Failed to load the asset catalog for the default assets', error)
    if (!resolvedSellAsset) console.error(`Unknown default sell asset: ${String(sellAsset)}`)
    if (!resolvedBuyAsset) console.error(`Unknown default buy asset: ${String(buyAsset)}`)
  }, [isFetched, error, resolvedSellAsset, resolvedBuyAsset, sellAsset, buyAsset])

  if (!resolvedSellAsset || !resolvedBuyAsset) return null

  return children(resolvedSellAsset, resolvedBuyAsset)
}

export const DefaultAssets = (props: DefaultAssetsProps) => {
  const { sellAsset, buyAsset, children } = props

  if (typeof sellAsset === 'string' || typeof buyAsset === 'string') {
    return <DefaultAssetsById {...props} />
  }

  return children(sellAsset ?? DEFAULT_SELL_ASSET, buyAsset ?? DEFAULT_BUY_ASSET)
}
