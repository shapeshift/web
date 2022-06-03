import { AssetId, fromAssetId } from '@shapeshiftoss/caip'
import { Asset } from '@shapeshiftoss/types'
import axios from 'axios'

import assetsDescriptions from './descriptions.json'
import { getRenderedIdenticonBase64, IdenticonOptions } from './GenerateAssetIcon'
import localAssetData from './generatedAssetData.json'

type DescriptionData = Readonly<{
  description: string
  isTrusted?: boolean
}>

export type AssetsById = {
  [k: AssetId]: Asset
}

export class AssetService {
  private readonly assets: AssetsById

  constructor() {
    this.assets = localAssetData as AssetsById
  }

  getAll(): AssetsById {
    return this.assets
  }

  async description(assetId: AssetId): Promise<DescriptionData> {
    // deliberately loosen type def from statically defined json
    const descriptions: Record<string, string> = assetsDescriptions
    const description = descriptions[assetId]
    // Return overridden asset description if it exists and add isTrusted for description links
    if (description) return { description, isTrusted: true }

    try {
      type CoinData = {
        description: {
          en: string
        }
      }
      // TODO(0xdef1cafe): this is dumb luck, add a coingecko specific map here
      const chain = this.assets[assetId].chain
      const contractUrl = `/contract/${fromAssetId(assetId).assetReference.toLowerCase()}`
      const { data } = await axios.get<CoinData>(
        `https://api.coingecko.com/api/v3/coins/${chain}${contractUrl}`
      )

      return { description: data?.description?.en ?? '' }
    } catch (e) {
      const errorMessage = `AssetService:description: no description available for ${assetId}`
      throw new Error(errorMessage)
    }
  }

  async generateAssetIconBase64(
    identity: string,
    text?: string,
    options?: IdenticonOptions
  ): Promise<string> {
    return getRenderedIdenticonBase64(identity, text, options)
  }
}
