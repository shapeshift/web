import type { Asset } from '@shapeshiftoss/types'
import { useMemo } from 'react'

import { selectAssets } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

/**
 * Creates a Map<Symbol, Asset> for O(1) lookup of assets by symbol.
 * This replaces O(N) array searches which are expensive in loops.
 */
export const useSymbolToAssetMap = () => {
  const assets = useAppSelector(selectAssets)

  return useMemo(() => {
    const map = new Map<string, Asset>()
    const assetValues = Object.values(assets)

    // We want to match the behavior of `find()` which returns the first match.
    // So we only set the key if it doesn't exist yet.
    for (const asset of assetValues) {
      if (!asset?.symbol) continue
      if (!map.has(asset.symbol)) {
        map.set(asset.symbol, asset)
      }
    }
    return map
  }, [assets])
}
