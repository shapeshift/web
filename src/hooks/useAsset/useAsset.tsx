import { CAIP19 } from '@shapeshiftoss/caip'
import { findByCaip19 } from '@shapeshiftoss/market-service'
import { Asset, MarketData } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchAsset, selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { useAppSelector } from 'state/store'

export type AssetMarketData = Asset & MarketData & { description?: string }

export const useGetAssetData = (caip19: CAIP19) => {
  const dispatch = useDispatch()
  const asset = useAppSelector(state => selectAssetByCAIP19(state, caip19))

  useEffect(() => {
    if (asset) return
    dispatch(fetchAsset(caip19))
  }, [asset, caip19, dispatch])

  const fetchMarketData = useCallback(
    async (caip?: CAIP19): Promise<MarketData | null> => {
      const marketData: MarketData | null = await findByCaip19({ caip19: caip || caip19 })

      return marketData
    },
    [caip19]
  )
  return fetchMarketData
}
