import { BaseAsset, Asset, NetworkTypes, ChainTypes } from '@shapeshiftoss/types'
import axios from 'axios'
import localAssetData from './generatedAssetData.json'

export const flattenAssetData = (assetData: BaseAsset[]): Asset[] => {
  const flatAssetData: Asset[] = []
  for (const baseAsset of assetData) {
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
  return flatAssetData
}

const getDataIndexKey = (chain: ChainTypes, network: NetworkTypes, tokenId?: string): string => {
  return chain + '_' + network + (tokenId ? '_' + tokenId : '')
}

export const indexAssetData = (flatAssetData: Asset[]): IndexedAssetData => {
  return flatAssetData.reduce((acc, val) => {
    return { ...acc, [getDataIndexKey(val.chain, val.network, val.tokenId)]: val }
  }, {})
}

export type IndexedAssetData = {
  [k: string]: Asset
}

type ByTokenIdArgs = {
  chain: ChainTypes
  network?: NetworkTypes
  tokenId?: string
}

export class AssetService {
  private assetFileUrl: string

  private assetData: BaseAsset[]
  private flatAssetData: Asset[]
  private indexedAssetData: IndexedAssetData

  constructor(assetFileUrl: string) {
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
      const { data } = await axios.get<BaseAsset[]>(this.assetFileUrl)
      this.assetData = data
    } catch (err) {
      this.assetData = localAssetData as BaseAsset[]
    }

    this.flatAssetData = flattenAssetData(this.assetData)
    this.indexedAssetData = indexAssetData(this.flatAssetData)
  }

  /**
   * Get list of all assets on a given network (mainnet, ropsten, etc) or all assets across all networks
   * @param network mainnet, testnet, eth ropsten, etc
   * @returns base coins (ETH, BNB, etc...) along with their supported tokens in a flattened list
   */
  byNetwork(network?: NetworkTypes): Asset[] {
    this.checkInitialized()
    return network
      ? this.flatAssetData.filter((asset) => asset.network == network)
      : this.flatAssetData
  }

  /**
   * Find an asset by chain, network and tokenId
   * @param chain blockchain to look up by (btc, eth, etc...)
   * @param network mainnet, testnet, eth ropsten, etc
   * @param tokenId token identifier (contract address on eth)
   * @returns First asset found
   */
  byTokenId({ chain, network, tokenId }: ByTokenIdArgs): Asset | undefined {
    this.checkInitialized()
    const index = getDataIndexKey(chain, network ?? NetworkTypes.MAINNET, tokenId)
    return this.indexedAssetData[index]
  }

  async description(chain: ChainTypes, tokenId?: string): Promise<string | null> {
    const contractUrl = typeof tokenId === 'string' ? `/contract/${tokenId?.toLowerCase()}` : ''
    try {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${chain}${contractUrl}`
      )
      return data?.description?.en || null
    } catch (e) {
      console.error('AssetService:description:error', e)
      return null
    }
  }
}
