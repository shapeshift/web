import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { useFoxy } from 'features/defi/contexts/FoxyProvider/FoxyProvider'
import { useCallback, useEffect, useState } from 'react'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type UseFoxyMarketDataReturnType = {
  maxTotalSupply?: string
}

// TODO use constant from constants file when get FOX wire up is merged
const FoxyAssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'

export const useFoxyMarketData = (): UseFoxyMarketDataReturnType => {
  const { foxy } = useFoxy()
  const asset = useAppSelector(state => selectAssetById(state, FoxyAssetId))
  const [maxTotalSupply, setMaxTotalSupply] = useState<string>()

  const fetchData = useCallback(async () => {
    const tokenContractAddress = foxyAddresses[0].foxy
    const foxyTotalSupply = await foxy?.totalSupply({ tokenContractAddress })
    setMaxTotalSupply(foxyTotalSupply?.div(`1e+${asset.precision}`).toString())
  }, [foxy, asset])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    maxTotalSupply,
  }
}
