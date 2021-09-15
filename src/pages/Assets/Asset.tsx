import { Flex } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/asset-service'
import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { AssetMarketData, useGetAssetData } from 'hooks/useAsset/useAsset'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

import { AssetDetails } from './AssetDetails/AssetDetails'

export interface MatchParams {
  network: string
  address: string
}

const initAsset = {
  chain: ChainTypes.Ethereum,
  network: NetworkTypes.MAINNET,
  symbol: '',
  name: '',
  precision: 18,
  color: '',
  secondaryColor: '',
  icon: '',
  sendSupport: true,
  receiveSupport: true,
  price: '',
  marketCap: '',
  volume: '',
  changePercent24Hr: 0,
  description: ''
}

export const Asset = () => {
  const [isLoaded, setIsLoaded] = useStateIfMounted<boolean>(false)
  const [asset, setAsset] = useStateIfMounted<AssetMarketData | undefined>(undefined)

  let { network, address } = useParams<MatchParams>()
  const getAssetData = useGetAssetData()
  const getPrice = useCallback(async () => {
    const asset = await getAssetData({
      chain: ChainTypes.Ethereum,
      network: NetworkTypes.MAINNET,
      tokenId: address
    })
    if (asset) setAsset(asset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, getAssetData])

  useEffect(() => {
    ;(async () => {
      setIsLoaded(false)
      setTimeout(async () => {
        await getPrice()
        setIsLoaded(true)
      }, 750)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, address])

  return (
    <Page style={{ flex: 1 }} key={address}>
      <Flex role='main' flex={1} height='100%'>
        <AssetDetails asset={asset ?? initAsset} isLoaded={isLoaded} />
      </Flex>
    </Page>
  )
}
