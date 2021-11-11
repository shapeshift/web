import { Flex } from '@chakra-ui/react'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
import { useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { useFetchAsset } from 'hooks/useFetchAsset/useFetchAsset'
import { useMarketData } from 'hooks/useMarketData/useMarketData'
import { ReduxState } from 'state/reducer'

import { AssetDetails } from './AssetDetails/AssetDetails'
export interface MatchParams {
  chain: ChainTypes
  tokenId: string
}

export const initAsset = {
  caip19: '',
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

export const useAsset = () => {
  const { chain, tokenId } = useParams<MatchParams>()
  const asset = useFetchAsset({ chain, tokenId })
  const marketData = useMarketData({ chain, tokenId })
  const loading = useSelector((state: ReduxState) => state.marketData.loading)

  return {
    asset: asset ?? initAsset,
    marketData,
    loading
  }
}

export const Asset = () => {
  const { asset } = useAsset()

  return (
    <Page style={{ flex: 1 }} key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetDetails />
      </Flex>
    </Page>
  )
}
