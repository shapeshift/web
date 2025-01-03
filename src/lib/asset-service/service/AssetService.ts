import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import type { Asset, AssetsById } from '@shapeshiftoss/types'
import axios from 'axios'
import Polyglot from 'node-polyglot'

import { descriptions } from './descriptions'
import { localAssetData, relatedAssetIndex } from './localAssetData'

type DescriptionData = Readonly<{ description: string; isTrusted?: boolean }>

export class AssetService {
  readonly assetsById: AssetsById
  readonly relatedAssetIndex: Record<AssetId, AssetId[]>

  constructor() {
    this.assetsById = localAssetData
    this.relatedAssetIndex = relatedAssetIndex
  }

  get assetIds(): AssetId[] {
    return Object.keys(this.assetsById)
  }

  get assets(): Asset[] {
    return Object.values(this.assetsById) as Asset[]
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
