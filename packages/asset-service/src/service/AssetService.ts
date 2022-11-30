import { adapters, AssetId, ChainId } from '@shapeshiftoss/caip'
import axios from 'axios'
import Polyglot from 'node-polyglot'

import assetsDescriptions from './descriptions'
import localAssetData from './generatedAssetData.json'

type DescriptionData = Readonly<{ description: string; isTrusted?: boolean }>

export type Asset = {
  assetId: AssetId
  chainId: ChainId
  description?: string
  isTrustedDescription?: boolean
  symbol: string
  name: string
  precision: number
  color: string
  icon: string
  explorer: string
  explorerTxLink: string
  explorerAddressLink: string
}

export type AssetsById = Record<AssetId, Asset>

export class AssetService {
  private readonly assets: AssetsById

  constructor() {
    this.assets = localAssetData as AssetsById
  }

  getAll(): AssetsById {
    return this.assets
  }

  async description(assetId: AssetId, locale = 'en'): Promise<DescriptionData> {
    const localeDescriptions = assetsDescriptions[locale]
    // Return overridden asset description if it exists and add isTrusted for description links
    if (localeDescriptions[assetId] || assetsDescriptions.en[assetId]) {
      const polyglot = new Polyglot({
        phrases: localeDescriptions,
        allowMissing: true,
        onMissingKey: (key) => assetsDescriptions.en[key], // fallback to English overriden description, which should always be added as a base translation
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
