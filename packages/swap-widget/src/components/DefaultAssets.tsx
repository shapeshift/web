import { fromAssetId, toAssetId } from '@shapeshiftoss/caip'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'

import { isSupportedChainId } from '../constants/chains'
import { DEFAULT_BUY_ASSET, DEFAULT_SELL_ASSET } from '../constants/defaults'
import { useAssetsById } from '../hooks/useAssets'
import type { Asset, AssetId, SwapWidgetProps } from '../types'
import { PoweredBy } from './PoweredBy'
import { WidgetFrame } from './WidgetFrame'

type DefaultAssetsProps = {
  theme: SwapWidgetProps['theme']
  showPoweredBy: boolean
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

// Built from the input step's own containers, so the skeleton takes the same height as the real card
const SkeletonTokenSection = () => (
  <div className='ssw-token-section'>
    <div className='ssw-section-header'>
      <span className='ssw-skeleton-bar ssw-skeleton-label' />
    </div>
    <div className='ssw-input-row'>
      <span className='ssw-skeleton-bar ssw-skeleton-amount' />
      <span className='ssw-skeleton-bar ssw-skeleton-token' />
    </div>
    <div className='ssw-section-footer'>
      <span className='ssw-skeleton-bar ssw-skeleton-footer' />
    </div>
  </div>
)

// The header and footer never change between states, so they hold the frame's height from the start
const DefaultAssetsSkeleton = ({ showPoweredBy }: { showPoweredBy: boolean }) => (
  <>
    <div className='ssw-header'>
      <span className='ssw-header-title'>Swap</span>
    </div>
    <div className='ssw-swap-container' aria-busy='true'>
      <SkeletonTokenSection />
      <div className='ssw-skeleton-divider' />
      <SkeletonTokenSection />
    </div>
    <div className='ssw-skeleton-bar ssw-skeleton-action' />
    {showPoweredBy && <PoweredBy />}
  </>
)

// Defaults seed once at mount, so an id has to be looked up in the catalog before the widget renders
export const DefaultAssets = ({
  theme,
  showPoweredBy,
  sellAsset,
  buyAsset,
  children,
}: DefaultAssetsProps) => {
  // Captured at mount so a later prop change can't swap the running widget for the skeleton
  const initialSellAsset = useRef(sellAsset).current
  const initialBuyAsset = useRef(buyAsset).current

  const hasAssetId = typeof initialSellAsset === 'string' || typeof initialBuyAsset === 'string'
  const { data: assetsById, isFetched, error } = useAssetsById({ enabled: hasAssetId })

  const resolvedSellAsset = resolveAsset(initialSellAsset, assetsById, DEFAULT_SELL_ASSET)
  const resolvedBuyAsset = resolveAsset(initialBuyAsset, assetsById, DEFAULT_BUY_ASSET)
  const isResolved = !!resolvedSellAsset && !!resolvedBuyAsset

  useEffect(() => {
    if (!isFetched || isResolved) return
    if (error) {
      console.error('Failed to load the asset catalog for the default assets', error)
      return
    }
    if (!resolvedSellAsset) console.error(`Unknown default sell asset: ${String(initialSellAsset)}`)
    if (!resolvedBuyAsset) console.error(`Unknown default buy asset: ${String(initialBuyAsset)}`)
  }, [
    isFetched,
    isResolved,
    error,
    resolvedSellAsset,
    resolvedBuyAsset,
    initialSellAsset,
    initialBuyAsset,
  ])

  return (
    <WidgetFrame theme={theme}>
      {isResolved ? (
        children(resolvedSellAsset, resolvedBuyAsset)
      ) : (
        <DefaultAssetsSkeleton showPoweredBy={showPoweredBy} />
      )}
    </WidgetFrame>
  )
}
