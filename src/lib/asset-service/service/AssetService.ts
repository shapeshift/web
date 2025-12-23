import type { AssetId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumChainId,
  arbitrumNovaChainId,
  baseChainId,
  bscChainId,
  gnosisChainId,
  hyperEvmChainId,
  mayachainChainId,
  monadChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
  suiChainId,
  tronChainId,
  zecChainId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import axios from 'axios'
import Polyglot from 'node-polyglot'

import { descriptions } from './descriptions'

import { getConfig } from '@/config'

type DescriptionData = Readonly<{ description: string; isTrusted?: boolean }>

// Don't export me, access me through the getter because instantiation is extremely expensive
class _AssetService {
  private _assetsById: AssetsById = {}
  private _relatedAssetIndex: Record<AssetId, AssetId[]> = {}
  private _assetIds: AssetId[] = []
  private _assets: Asset[] = []
  private initialized = false

  get assetsById() {
    return this._assetsById
  }
  get relatedAssetIndex() {
    return this._relatedAssetIndex
  }
  get assetIds() {
    return this._assetIds
  }
  get assets() {
    return this._assets
  }

  async init(): Promise<void> {
    if (this.initialized) return // Already initialized

    const [assetDataJson, relatedAssetIndex] = await (async () => {
      if (typeof window === 'undefined') {
        // Node.js environment (generation scripts)
        const fs = await import('fs')
        const path = await import('path')
        const assetDataPath = path.join(process.cwd(), 'public/generated/generatedAssetData.json')
        const relatedAssetIndexPath = path.join(
          process.cwd(),
          'public/generated/relatedAssetIndex.json',
        )
        return Promise.all([
          JSON.parse(fs.readFileSync(assetDataPath, 'utf8')),
          JSON.parse(fs.readFileSync(relatedAssetIndexPath, 'utf8')),
        ])
      } else {
        // Browser environment - fetch with cache-busting hash
        const manifest = await (async () => {
          try {
            return await fetch('/generated/asset-manifest.json').then(r => r.json())
          } catch {
            console.warn('asset-manifest.json not found, using timestamp for cache busting')
            return { assetData: Date.now().toString(), relatedAssetIndex: Date.now().toString() }
          }
        })()

        return Promise.all([
          fetch(`/generated/generatedAssetData.json?v=${manifest.assetData}`).then(r => r.json()),
          fetch(`/generated/relatedAssetIndex.json?v=${manifest.relatedAssetIndex}`).then(r =>
            r.json(),
          ),
        ])
      }
    })()

    const localAssetData = assetDataJson.byId
    const sortedAssetIds = assetDataJson.ids

    // Compute isPrimary and isChainSpecific for each asset
    Object.values(localAssetData).forEach(asset => {
      if (asset) {
        const assetTyped = asset as Asset
        assetTyped.isPrimary =
          assetTyped.relatedAssetKey === null || assetTyped.relatedAssetKey === assetTyped.assetId
        assetTyped.isChainSpecific = assetTyped.relatedAssetKey === null
      }
    })

    const config = getConfig()

    // Filter asset data while preserving sorting
    const filteredAssetIds = sortedAssetIds.filter((assetId: AssetId) => {
      const asset = localAssetData[assetId]
      if (!config.VITE_FEATURE_OPTIMISM && asset.chainId === optimismChainId) return false
      if (!config.VITE_FEATURE_BNBSMARTCHAIN && asset.chainId === bscChainId) return false
      if (!config.VITE_FEATURE_POLYGON && asset.chainId === polygonChainId) return false
      if (!config.VITE_FEATURE_GNOSIS && asset.chainId === gnosisChainId) return false
      if (!config.VITE_FEATURE_ARBITRUM && asset.chainId === arbitrumChainId) return false
      if (!config.VITE_FEATURE_ARBITRUM_NOVA && asset.chainId === arbitrumNovaChainId) return false
      if (!config.VITE_FEATURE_BASE && asset.chainId === baseChainId) return false
      if (!config.VITE_FEATURE_SOLANA && asset.chainId === solanaChainId) return false
      if (!config.VITE_FEATURE_SUI && asset.chainId === suiChainId) return false
      if (!config.VITE_FEATURE_TRON && asset.chainId === tronChainId) return false
      if (!config.VITE_FEATURE_MONAD && asset.chainId === monadChainId) return false
      if (!config.VITE_FEATURE_HYPEREVM && asset.chainId === hyperEvmChainId) return false
      if (!config.VITE_FEATURE_MAYACHAIN && asset.chainId === mayachainChainId) return false
      if (!config.VITE_FEATURE_ZCASH && asset.chainId === zecChainId) return false
      return true
    })

    // Assign to private properties
    this._assetIds = filteredAssetIds
    this._assets = filteredAssetIds.map((assetId: AssetId) => localAssetData[assetId])
    this._assetsById = Object.fromEntries(
      filteredAssetIds.map((assetId: AssetId) => [assetId, localAssetData[assetId]]),
    )
    this._relatedAssetIndex = relatedAssetIndex

    this.initialized = true
  }

  getRelatedAssetIds(assetId: AssetId): AssetId[] {
    const { relatedAssetKey } = this.assetsById[assetId] ?? {}
    return this.relatedAssetIndex[relatedAssetKey ?? ''] ?? []
  }

  async description(assetId: AssetId, locale = 'en'): Promise<DescriptionData> {
    const localeDescriptions = descriptions[locale]
    // Return overridden asset description if it exists and add isTrusted for description links
    if (localeDescriptions[assetId] || descriptions.en[assetId]) {
      const polyglot = new Polyglot({
        phrases: localeDescriptions,
        allowMissing: true,
        onMissingKey: key => descriptions.en[key], // fallback to English overridden description, which should always be added as a base translation
      })
      const overriddenDescription = polyglot.t(assetId)

      return { description: overriddenDescription, isTrusted: true }
    }

    try {
      type CoinData = { description: { [locale: string]: string } }

      const url = adapters.makeCoingeckoAssetUrl(assetId)
      if (!url) throw new Error()

      const { data } = await axios.get<CoinData>(url)

      if (!data?.description) return { description: '' }

      const description = (data.description[locale] || data.description.en) ?? ''

      return { description }
    } catch (e) {
      const errorMessage = `AssetService:description: no description available for ${assetId}`
      throw new Error(errorMessage)
    }
  }
}

// Export the public interface of the AssetService class while keeping the implementation private
export type AssetService = _AssetService

// Don't export me, access me through the getter
let _assetService: AssetService | undefined = undefined

export const getAssetService = async (): Promise<AssetService> => {
  if (!_assetService) {
    _assetService = new _AssetService()
    await _assetService.init()
  }
  return _assetService
}

// For places that need synchronous access AFTER initialization
export const getAssetServiceSync = (): AssetService => {
  if (!_assetService) {
    throw new Error('AssetService not initialized - call getAssetService() first')
  }
  return _assetService
}
