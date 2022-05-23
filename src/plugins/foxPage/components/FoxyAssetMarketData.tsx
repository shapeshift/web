import { AssetId } from '@shapeshiftoss/caip'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useCallback, useEffect, useState } from 'react'
import { AssetMarketData } from 'components/AssetHeader/AssetMarketData'
import { selectAssetById } from 'state/slices/selectors'
import { selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type FoxyAssetMarketDataProps = {
  assetId: AssetId
}

export const FoxyAssetMarketData = ({ assetId }: FoxyAssetMarketDataProps) => {
  const { foxy } = useFoxy()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
  const [maxTotalSupply, setMaxTotalSupply] = useState<string>()
  const [marketCap, setMarketCap] = useState<string>()

  const fetchData = useCallback(async () => {
    const tokenContractAddress = foxyAddresses[0].foxy
    const foxyTotalSupply = await foxy?.totalSupply({ tokenContractAddress })
    setMaxTotalSupply(foxyTotalSupply?.div(`1e+${asset.precision}`).toString())
    setMarketCap(foxyTotalSupply?.div(`1e+${asset.precision}`).times(marketData?.price).toString())
  }, [foxy, asset, marketData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (!maxTotalSupply) return null

  return (
    <AssetMarketData
      assetId={assetId}
      fallbackMaxSupply={maxTotalSupply}
      fallbackMarketCap={marketCap}
    ></AssetMarketData>
  )
}
