import { Flex } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { AssetMarketData, useGetAssetData } from 'hooks/useAsset/useAsset'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'

import { AssetDetails } from './AssetDetails/AssetDetails'

export interface MatchParams {
  network: ChainTypes
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
  slip44: 60,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  description: ''
}

const ALLOWED_CHAINS = {
  [ChainTypes.Ethereum]: true,
  [ChainTypes.Bitcoin]: true
}

export const Asset = () => {
  const [isLoaded, setIsLoaded] = useStateIfMounted<boolean>(false)
  const [asset, setAsset] = useStateIfMounted<AssetMarketData | undefined>(undefined)

  let { network, address } = useParams<MatchParams>()
  const getAssetData = useGetAssetData()

  const getPrice = useCallback(async () => {
    if (ALLOWED_CHAINS[network]) {
      const asset = await getAssetData({
        chain: network,
        network: NetworkTypes.MAINNET,
        tokenId: address
      })
      if (asset) setAsset(asset)
    }
  }, [address, getAssetData, network]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    ;(async () => {
      setIsLoaded(false)
      setTimeout(async () => {
        await getPrice()
        setIsLoaded(true)
      }, 750)
    })()
  }, [network, address]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page style={{ flex: 1 }} key={address}>
      <Flex role='main' flex={1} height='100%'>
        <AssetDetails asset={asset ?? initAsset} isLoaded={isLoaded} />
      </Flex>
    </Page>
  )
}
