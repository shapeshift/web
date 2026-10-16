import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { isSupportedChainId } from '../constants/chains'
import { DEFAULT_BUY_ASSET, DEFAULT_SELL_ASSET } from '../constants/defaults'
import { useAssetsById } from '../hooks/useAssets'
import type { Asset, AssetId, SwapWidgetProps } from '../types'
import { WidgetFrame } from './WidgetFrame'

type DefaultAssetsProps = {
  theme: SwapWidgetProps['theme']
  sellAsset: Asset | AssetId | undefined
  buyAsset: Asset | AssetId | undefined
  children: (sellAsset: Asset, buyAsset: Asset) => ReactNode
}

// Catalog keys are canonical, so a checksummed contract address has to be lowercased to match
const normalizeAssetId = (assetId: AssetId): AssetId | undefined => {
  try {
    const { chainId, assetNamespace, assetReference } = fromAssetId(assetId)
    return toAssetId({ chainId, assetNamespace, assetReference })
  } catch {
    return undefined
  }
}

const resolveAsset = (
  asset: Asset | AssetId | undefined,
  assetsById: Record<AssetId, Asset>,
  fallback: Asset,
): Asset | undefined => {
  if (typeof asset !== 'string') return asset ?? fallback

  const normalizedId = normalizeAssetId(asset)
  const catalogAsset = normalizedId ? assetsById[normalizedId] : undefined

  return catalogAsset && isSupportedChainId(catalogAsset.chainId) ? catalogAsset : undefined
}

const DefaultAssetsSkeleton = () => (
  <div className='ssw-swap-container ssw-skeleton-container' aria-busy='true'>
    <div className='ssw-token-section'>
      <div className='ssw-skeleton-bar ssw-skeleton-label' />
      <div className='ssw-skeleton-bar ssw-skeleton-amount' />
    </div>
    <div className='ssw-token-section'>
      <div className='ssw-skeleton-bar ssw-skeleton-label' />
      <div className='ssw-skeleton-bar ssw-skeleton-amount' />
    </div>
    <div className='ssw-skeleton-bar ssw-skeleton-action' />
  </div>
)

// Defaults seed once at mount, so an id has to be looked up in the catalog before the widget renders
export const DefaultAssets = ({ theme, sellAsset, buyAsset, children }: DefaultAssetsProps) => {
  const hasAssetId = typeof sellAsset === 'string' || typeof buyAsset === 'string'
  const { data: assetsById, isFetched, error } = useAssetsById({ enabled: hasAssetId })

  const resolvedSellAsset = resolveAsset(sellAsset, assetsById, DEFAULT_SELL_ASSET)
  const resolvedBuyAsset = resolveAsset(buyAsset, assetsById, DEFAULT_BUY_ASSET)
  const isResolved = !!resolvedSellAsset && !!resolvedBuyAsset

  useEffect(() => {
    if (!isFetched || isResolved) return
    if (error) {
      console.error('Failed to load the asset catalog for the default assets', error)
      return
    }
    if (!resolvedSellAsset) console.error(`Unknown default sell asset: ${String(sellAsset)}`)
    if (!resolvedBuyAsset) console.error(`Unknown default buy asset: ${String(buyAsset)}`)
  }, [isFetched, isResolved, error, resolvedSellAsset, resolvedBuyAsset, sellAsset, buyAsset])

  return (
    <WidgetFrame theme={theme}>
      {isResolved ? children(resolvedSellAsset, resolvedBuyAsset) : <DefaultAssetsSkeleton />}
    </WidgetFrame>
  )
}
