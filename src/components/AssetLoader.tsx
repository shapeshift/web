import { btcAssetId, ethAssetId, foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { getBaseAsset } from '@shapeshiftoss/utils'
import React, { useEffect, useState } from 'react'

import { getAssetService } from '@/lib/asset-service'
import { SplashScreen } from '@/pages/SplashScreen/SplashScreen'
import { assets } from '@/state/slices/assetsSlice/assetsSlice'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch } from '@/state/store'

export const AssetLoader = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const dispatch = useAppDispatch()

  useEffect(() => {
    const initAssets = async () => {
      try {
        // Initialize asset service (fetches and decodes asset data)
        const service = await getAssetService()

        // Enrich assets with chain-level data (networkName, explorer URLs)
        const enrichedAssetsById = Object.fromEntries(
          Object.entries(service.assetsById).map(([assetId, asset]) => {
            const baseAsset = getBaseAsset(asset.chainId)
            return [
              assetId,
              {
                ...asset,
                networkName: baseAsset.networkName,
                explorer: baseAsset.explorer,
                explorerAddressLink: baseAsset.explorerAddressLink,
                explorerTxLink: baseAsset.explorerTxLink,
              },
            ]
          }),
        )

        // Populate Redux with enriched assets
        dispatch(
          assets.actions.upsertAssets({
            byId: enrichedAssetsById,
            ids: service.assetIds,
          }),
        )

        // Set relatedAssetIndex
        dispatch(assets.actions.setRelatedAssetIndex(service.relatedAssetIndex))

        // Initialize trade slices with proper buy/sell assets
        const btcAsset = service.assetsById[btcAssetId]
        const ethAsset = service.assetsById[ethAssetId]
        const foxAsset = service.assetsById[foxAssetId]
        const usdcAsset = service.assetsById[usdcAssetId]

        if (btcAsset && ethAsset) {
          dispatch(tradeInput.actions.setBuyAsset(btcAsset))
          dispatch(tradeInput.actions.setSellAsset(ethAsset))
          dispatch(tradeRampInput.actions.setBuyAsset(btcAsset))
          dispatch(tradeRampInput.actions.setSellAsset(ethAsset))
        }

        if (foxAsset && usdcAsset) {
          dispatch(limitOrderInput.actions.setBuyAsset(foxAsset))
          dispatch(limitOrderInput.actions.setSellAsset(usdcAsset))
        }

        setReady(true)
      } catch (err) {
        console.error('Failed to load asset data:', err)
        setError(err instanceof Error ? err : new Error('Failed to load assets'))
      }
    }

    initAssets()
  }, [dispatch])

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Failed to Load Asset Data</h1>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Reload</button>
      </div>
    )
  }

  if (!ready) {
    return <SplashScreen />
  }

  return <>{children}</>
}
