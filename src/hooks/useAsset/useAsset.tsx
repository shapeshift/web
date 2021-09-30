import { getMarketData } from '@shapeshiftoss/market-service'
import { Asset, ChainTypes, MarketData, NetworkTypes } from '@shapeshiftoss/types'
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
      const marketData: MarketData | null = await getMarketData({ chain, tokenId })
      const assetData: Asset | undefined = assetService.byTokenId({ chain, network, tokenId })
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
