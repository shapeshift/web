import { ChainTypes, NetworkTypes } from '@shapeshiftoss/asset-service'
import { Asset } from '@shapeshiftoss/asset-service'
import { getMarketData, MarketData } from '@shapeshiftoss/market-service'
import { useCallback } from 'react'

import { useAssets } from '../../context/AssetProvider/AssetProvider'

export type AssetMarketData = Asset & MarketData & { description: string }

export const useGetAssetData = (): any => {
  const assetService = useAssets()

  return useCallback(
    async ({
      chain,
      network,
      tokenId
    }: {
      chain: ChainTypes
      network: NetworkTypes
      tokenId?: string
    }) => {
      const marketData: MarketData | null = await getMarketData(chain, tokenId)
      const assetData: Asset | undefined = await assetService.byTokenId(chain, network, tokenId)
      const description = await assetService.description(chain, tokenId)

      return {
        ...marketData,
        ...assetData,
        description
      }
    },
    [assetService]
  )
}
