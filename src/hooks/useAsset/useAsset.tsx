import { getMarketData } from '@shapeshiftoss/market-service'
import { assetService, ChainTypes, marketService, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchAsset } from 'state/slices/assetsSlice/assetsSlice'

export type AssetMarketData = assetService.Asset & marketService.Data & { description?: string }

export const ALLOWED_CHAINS = {
  [ChainTypes.Ethereum]: true,
  [ChainTypes.Bitcoin]: true
}

export const useGetAssetData = ({ chain, tokenId }: { chain: ChainTypes; tokenId?: string }) => {
  const dispatch = useDispatch()
  const asset = useSelector((state: ReduxState) => state.assets[tokenId ?? chain])

  useEffect(() => {
    if (ALLOWED_CHAINS[chain]) {
      if (!asset) {
        dispatch(
          fetchAsset({
            chain,
            network: NetworkTypes.MAINNET,
            tokenId
          })
        )
      }
    }
  }, [asset, chain, dispatch, tokenId])

  const fetchMarketData = useCallback(
    async ({
      chain,
      tokenId
    }: {
      chain: ChainTypes
      tokenId?: string
    }): Promise<marketService.Data> => {
      const marketData: marketService.Data | null = await getMarketData({ chain, tokenId })

      return marketData
    },
    []
  )
  return fetchMarketData
}
