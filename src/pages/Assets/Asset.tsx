import { Flex } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'

import { AssetDetails } from './AssetDetails/AssetDetails'
export interface MatchParams {
  chain: ChainTypes
  tokenId: string
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
  description: '',
  caip19: ''
}

export const Asset = () => {
  const { chain, tokenId } = useParams<MatchParams>()
  const asset = useFetchAsset({ chain, tokenId })
  const marketData = useMarketData({ chain, tokenId })

  return (
    <Page style={{ flex: 1 }} key={tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetDetails
          asset={asset && marketData ? { ...asset, ...marketData } : initAsset}
          isLoaded={!!marketData}
        />
      </Flex>
    </Page>
  )
}
