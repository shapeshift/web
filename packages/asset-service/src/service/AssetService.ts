import { BaseAsset, Asset, NetworkTypes } from '../types'
import axios from 'axios'
import localAssetData from './generatedAssetData.json'

export class AssetService {
  private assetFileUrl: string | undefined

  private assetData: BaseAsset[]
  private flatAssetData: Asset[]

  constructor(assetFileUrl?: string) {
    this.assetFileUrl = assetFileUrl
  }

  get isInitialized(): boolean {
    return Array.isArray(this.assetData) && Array.isArray(this.flatAssetData)
  }

  private checkInitialized() {
    if (!this.isInitialized) throw new Error('Asset service not initialized')
  }

  /**
   * Get asset data from assetFileUrl and flatten it for easier use
   */
  async initialize() {
    try {
      if (!this.assetFileUrl) throw new Error()
      const { data } = await axios.get<BaseAsset[]>(this.assetFileUrl)
      this.assetData = data
    } catch (err) {
      this.assetData = localAssetData as BaseAsset[]
    }

    const flatAssetData: Asset[] = []

    for (const baseAsset of this.assetData) {
      const newAsset = { ...baseAsset }
      delete newAsset.tokens
      flatAssetData.push(newAsset)
      if (baseAsset.tokens) {
        for (const tokenAsset of baseAsset.tokens) {
          flatAssetData.push({
            ...tokenAsset,
            chain: baseAsset.chain,
            network: baseAsset.network,
            slip44: baseAsset.slip44,
            explorer: baseAsset.explorer,
            explorerTxLink: baseAsset.explorerTxLink
          })
        }
      }
    }

    this.flatAssetData = flatAssetData
  }

  /**
   * Get list of all assets on a given network (mainnet, ropsten, etc) or all assets across all networks
   * @returns base coins (ETH, BNB, etc...) along with their supported tokens in a flattened list
   */
  byNetwork(network?: NetworkTypes): Asset[] {
    this.checkInitialized()
    return network
      ? this.flatAssetData.filter((asset) => asset.network == network)
      : this.flatAssetData
  }

  async description(name: string, tokenId?: string): Promise<string | null> {
    if (typeof name !== 'string') throw new Error('Invalid asset name')
    const contractUrl = typeof tokenId === 'string' ? `/contract/${tokenId?.toLowerCase()}` : ''
    try {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${name.toLowerCase()}${contractUrl}`
      )
      return data?.description?.en || null
    } catch (e) {
      console.error('AssetService:description:error', e)
      return null
    }
  }
}
