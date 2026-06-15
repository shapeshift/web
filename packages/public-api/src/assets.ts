import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import { getBaseAsset } from '@shapeshiftoss/utils'
import fs from 'fs'
import path from 'path'

import { SUPPORTED_CHAIN_IDS_SET } from './constants'

let assetsById: AssetsById = {}
let assetIds: AssetId[] = []
let assets: Asset[] = []
let initialized = false

export const initAssets = (): Promise<void> => {
  if (initialized) return Promise.resolve()

  console.log('Initializing assets...')

  try {
    const assetDataPath = path.join(__dirname, '../../../public/generated/generatedAssetData.json')

    const assetDataJson = JSON.parse(fs.readFileSync(assetDataPath, 'utf8'))
    const localAssetData = assetDataJson.byId
    const sortedAssetIds = assetDataJson.ids as AssetId[]

    // Enrich assets with chain-level data
    const enrichedAssetsById: AssetsById = {}
    for (const assetId of sortedAssetIds) {
      const asset = localAssetData[assetId]
      if (asset) {
        try {
          const baseAsset = getBaseAsset(asset.chainId)
          enrichedAssetsById[assetId] = {
            ...asset,
            networkName: baseAsset?.networkName,
            networkIcon: baseAsset?.networkIcon ?? baseAsset?.icon,
            networkColor: baseAsset?.networkColor ?? baseAsset?.color,
            explorer: baseAsset?.explorer,
            explorerAddressLink: baseAsset?.explorerAddressLink,
            explorerTxLink: baseAsset?.explorerTxLink,
          }
        } catch (error) {
          console.warn('Failed to enrich asset with base chain data', {
            assetId,
            chainId: asset.chainId,
            error,
          })
          enrichedAssetsById[assetId] = asset
        }
      }
    }

    assetsById = enrichedAssetsById
    assetIds = sortedAssetIds.filter(id =>
      SUPPORTED_CHAIN_IDS_SET.has(enrichedAssetsById[id]?.chainId),
    )
    assets = assetIds.map((id: AssetId) => enrichedAssetsById[id]).filter(Boolean) as Asset[]

    console.log(`Loaded ${assetIds.length} assets from ${assetDataPath}`)
    initialized = true
    return Promise.resolve()
  } catch (error) {
    console.error('Failed to load assets:', error)
    return Promise.reject(error)
  }
}

// Full asset map (all chains) for swapper deps only — e.g. NearIntents denominates
// its affiliate fee in NEAR's fee asset (buildAffiliateFee silently returns undefined
// if the asset is missing), so filtering this to supported chains would drop
// affiliate fee metadata from NearIntents rates/quotes
export const getAssetsById = (): AssetsById => assetsById
export const getAssetIds = (): AssetId[] => assetIds
export const getAllAssets = (): Asset[] => assets
export const getAsset = (assetId: AssetId): Asset | undefined => {
  const asset = assetsById[assetId]
  if (!asset || !SUPPORTED_CHAIN_IDS_SET.has(asset.chainId)) return undefined
  return asset
}
