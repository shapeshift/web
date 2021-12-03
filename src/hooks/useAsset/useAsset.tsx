import { CAIP19 } from '@shapeshiftoss/caip'
import { getMarketData } from '@shapeshiftoss/market-service'
import { Asset, ChainTypes, MarketData } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ReduxState } from 'state/reducer'
import { fetchAsset, selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'

export type AssetMarketData = Asset & MarketData & { description?: string }

export const useGetAssetData = (caip19: CAIP19) => {
  const dispatch = useDispatch()
  const asset = useSelector((state: ReduxState) => selectAssetByCAIP19(state, caip19))

  useEffect(() => {
    if (asset) return
    dispatch(fetchAsset(caip19))
  }, [asset, caip19, dispatch])

  const fetchMarketData = useCallback(
    async ({ chain, tokenId }: { chain: ChainTypes; tokenId?: string }): Promise<MarketData> => {
      const marketData: MarketData | null = await getMarketData({ chain, tokenId })

      return marketData
    },
    []
  )
  return fetchMarketData
}
