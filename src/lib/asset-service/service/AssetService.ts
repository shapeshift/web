import type { AssetId } from '@shapeshiftoss/caip'
import {
  adapters,
  arbitrumChainId,
  arbitrumNovaChainId,
  baseChainId,
  bscChainId,
  gnosisChainId,
  optimismChainId,
  polygonChainId,
  solanaChainId,
} from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import axios from 'axios'
import { getConfig } from 'config'
import Polyglot from 'node-polyglot'

import { descriptions } from './descriptions'
import { localAssetData, relatedAssetIndex, sortedAssetIds } from './localAssetData'

type DescriptionData = Readonly<{ description: string; isTrusted?: boolean }>

export class AssetService {
  readonly assetsById: AssetsById
  readonly relatedAssetIndex: Record<AssetId, AssetId[]>
  readonly assetIds: AssetId[]
  readonly assets: Asset[]

  constructor() {
    const config = getConfig()

    // Filter asset data while preserving sorting
    this.assetIds = sortedAssetIds.filter(assetId => {
      const asset = localAssetData[assetId]
      if (!config.REACT_APP_FEATURE_OPTIMISM && asset.chainId === optimismChainId) return false
      if (!config.REACT_APP_FEATURE_BNBSMARTCHAIN && asset.chainId === bscChainId) return false
      if (!config.REACT_APP_FEATURE_POLYGON && asset.chainId === polygonChainId) return false
      if (!config.REACT_APP_FEATURE_GNOSIS && asset.chainId === gnosisChainId) return false
      if (!config.REACT_APP_FEATURE_ARBITRUM && asset.chainId === arbitrumChainId) return false
      if (!config.REACT_APP_FEATURE_ARBITRUM_NOVA && asset.chainId === arbitrumNovaChainId)
        return false
      if (!config.REACT_APP_FEATURE_BASE && asset.chainId === baseChainId) return false
      if (!config.REACT_APP_FEATURE_SOLANA && asset.chainId === solanaChainId) return false
      return true
    })

    // Preserve sorting
    this.assets = this.assetIds.map(assetId => localAssetData[assetId])

    // Minimize compute (within reason lol) while creating object from the filtered data
    this.assetsById = Object.fromEntries(
      this.assetIds.map(assetId => [assetId, localAssetData[assetId]]),
    )

    this.relatedAssetIndex = relatedAssetIndex
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
