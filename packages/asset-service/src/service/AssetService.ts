import { BaseAsset, Asset, NetworkTypes, ChainTypes } from '../types'
import axios from 'axios'
import localAssetData from './generatedAssetData.json'

export class AssetService {
  private assetFileUrl: string | undefined

  private assetData: BaseAsset[]
  private flatAssetData: Asset[]
  private indexedAssetData: { [key: string]: Asset }

  constructor(assetFileUrl?: string) {
    this.assetFileUrl = assetFileUrl
  }

  get isInitialized(): boolean {
    return Array.isArray(this.assetData) && Array.isArray(this.flatAssetData)
  }

  private checkInitialized() {
    if (!this.isInitialized) throw new Error('Asset service not initialized')
  }

  private getDataIndexKey(chain: ChainTypes, network: NetworkTypes, tokenId?: string): string {
    return chain + '_' + network + (tokenId ? '_' + tokenId : '')
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

    const indexedAssetData: { [key: string]: Asset } = flatAssetData.reduce((acc, val) => {
      return { ...acc, [this.getDataIndexKey(val.chain, val.network, val.tokenId)]: val }
    }, {})

    this.indexedAssetData = indexedAssetData
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
  byTokenId(chain: ChainTypes, network?: NetworkTypes, tokenId?: string): Asset | undefined {
    this.checkInitialized()

    // TODO use the indexed lookup here
    return this.flatAssetData.find(
      (asset: Asset) =>
        asset.chain === chain &&
        asset.tokenId?.toLowerCase() === tokenId?.toLowerCase() &&
        (network ? asset.network === network : asset.network === NetworkTypes.MAINNET)
    )
  }

  async description(chain: ChainTypes, tokenId?: string): Promise<string | null> {
    let coingecko_id
    if (chain === ChainTypes.ETH) coingecko_id = 'ethereum'
    else throw new Error('Unsupported chain type')

    const contractUrl = typeof tokenId === 'string' ? `/contract/${tokenId?.toLowerCase()}` : ''
    try {
      const { data } = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coingecko_id}${contractUrl}`
      )
      return data?.description?.en || null
    } catch (e) {
      console.error('AssetService:description:error', e)
      return null
    }
  }
}
