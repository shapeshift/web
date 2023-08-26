import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import axios from 'axios'
import Polyglot from 'node-polyglot'

import { descriptions } from './descriptions'
import { localAssetData } from './localAssetData'

type DescriptionData = Readonly<{ description: string; isTrusted?: boolean }>

export type Asset = {
  assetId: AssetId
  chainId: ChainId
  description?: string
  isTrustedDescription?: boolean
  symbol: string
  name: string
  id?: string
  networkName?: string
  precision: number
  color: string
  networkColor?: string
  icon: string
  icons?: string[]
  networkIcon?: string
  explorer: string
  explorerTxLink: string
  explorerAddressLink: string
}

export type AssetsById = Record<AssetId, Asset>

export class AssetService {
  readonly assetsById: AssetsById

  constructor() {
    this.assetsById = localAssetData as AssetsById
  }

  get assetIds(): AssetId[] {
    return Object.keys(this.assetsById)
  }

  get assets(): Asset[] {
    return Object.values(this.assetsById)
  }

  async description(assetId: AssetId, locale = 'en'): Promise<DescriptionData> {
    const localeDescriptions = descriptions[locale]
    // Return overridden asset description if it exists and add isTrusted for description links
    if (localeDescriptions[assetId] || descriptions.en[assetId]) {
      const polyglot = new Polyglot({
        phrases: localeDescriptions,
        allowMissing: true,
        onMissingKey: key => descriptions.en[key], // fallback to English overriden description, which should always be added as a base translation
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
