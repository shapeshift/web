import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_NAMESPACE, bscChainId, toAssetId } from '@shapeshiftoss/caip'
import axios from 'axios'
import type {
  CoinGeckoMarketCap,
  CoinGeckoMarketData,
} from 'lib/market-service/coingecko/coingecko-types'

import { COINGECKO_PLATFORM_ID_TO_CHAIN_ID } from './constants'

const coingeckoBaseUrl = 'https://api.proxy.shapeshift.com/api/v1/markets'

// Non-exhaustive types, refer to https://docs.coingecko.com/reference/coins-id and other endpoints for full response schema
type CoingeckoAssetDetails = {
  market_data: CoinGeckoMarketData
  asset_platform_id: string
  image: Record<string, string>
  name: string
  symbol: string
  detail_platforms: Record<string, { decimal_place: number; contract_address: string }>
  platforms: Record<string, string>
}

type MoverAsset = Pick<
  CoinGeckoMarketCap,
  'id' | 'symbol' | 'name' | 'image' | 'market_cap_rank'
> & {
  usd: string
  usd_24h_vol: string
  usd_1y_change: string
  assetId: AssetId
  details: CoingeckoAssetDetails
}

type MoversResponse = {
  top_gainers: MoverAsset[]
  top_losers: MoverAsset[]
}
export const getCoingeckoMovers = async (): Promise<MoverAsset[]> => {
  const { data } = await axios.get<MoversResponse>(
    `${coingeckoBaseUrl}/coins/top_gainers_losers?vs_currency=usd`,
  )

  const all = data.top_gainers.concat(data.top_losers)

  await Promise.allSettled(
    all.map(async (topMover, i) => {
      try {
        const { data } = await axios.get<CoingeckoAssetDetails>(
          `${coingeckoBaseUrl}/coins/${topMover.id}`,
        )
        const asset_platform_id = data.asset_platform_id

        const address = data.platforms?.[asset_platform_id]

        const chainId = COINGECKO_PLATFORM_ID_TO_CHAIN_ID[asset_platform_id]
        // TODO(gomes): handle native assets without platform id with a dedicated mapping for said native assets, and check for asset id vs. platform id here
        if (!chainId) return

        const assetId = toAssetId({
          chainId,
          assetNamespace: chainId === bscChainId ? ASSET_NAMESPACE.bep20 : ASSET_NAMESPACE.erc20,
          assetReference: address,
        })

        all[i] = {
          ...topMover,
          assetId,
          details: data,
        }
      } catch (error) {
        console.error(`Error fetching asset details for ${topMover.id}:`, error)
        return topMover
      }
    }),
  )

  return all.filter(mover => Boolean(mover.assetId))
}
