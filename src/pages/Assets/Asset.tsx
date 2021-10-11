import { Flex } from '@chakra-ui/react'
import { ChainTypes, MarketData, NetworkTypes } from '@shapeshiftoss/types'
import { useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { ALLOWED_CHAINS, useGetAssetData } from 'hooks/useAsset/useAsset'
import { useStateIfMounted } from 'hooks/useStateIfMounted/useStateIfMounted'
import { ReduxState } from 'state/reducer'

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

export const Asset = () => {
  const [isLoaded, setIsLoaded] = useStateIfMounted<boolean>(false)
  const [marketData, setMarketData] = useStateIfMounted<MarketData | undefined>(undefined)
  let { network, address } = useParams<MatchParams>()
  const getAssetData = useGetAssetData({ chain: network, tokenId: address })
  const asset = useSelector((state: ReduxState) => state.assets[address ?? network])

  const getPrice = useCallback(async () => {
    if (ALLOWED_CHAINS[network]) {
      const market = await getAssetData({
        chain: network,
        tokenId: address
      })
      if (market) setMarketData(market)
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
        <AssetDetails
          asset={asset && marketData ? { ...asset, ...marketData } : initAsset}
          isLoaded={isLoaded}
        />
      </Flex>
    </Page>
  )
}
