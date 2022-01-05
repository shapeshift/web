import { Flex } from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import {
  Asset as A,
  AssetDataSource,
  ChainTypes,
  ContractTypes,
  MarketData,
  NetworkTypes
} from '@shapeshiftoss/types'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectMarketDataById,
  selectMarketDataLoadingById
} from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppSelector } from 'state/store'

import { AssetDetails } from './AssetDetails/AssetDetails'
export interface MatchParams {
  chain: ChainTypes
  tokenId: string
}

// TODO(0xdef1cafe): this has to die, we can't return invalid assets
export const initAsset: A = {
  caip2: '',
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
  slip44: 60,
  explorer: 'https://etherscan.io',
  explorerTxLink: 'https://etherscan.io/tx/',
  explorerAddressLink: '',
  dataSource: AssetDataSource.CoinGecko,
  description: ''
}

export const initMarketData: MarketData = {
  price: '',
  marketCap: '',
  volume: '',
  changePercent24Hr: 0
}

export const useAsset = () => {
  const { chain, tokenId } = useParams<MatchParams>()
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const extra = tokenId ? { contractType, tokenId } : undefined
  const assetCAIP19 = caip19.toCAIP19({ chain, network, ...extra })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetCAIP19))

  return {
    asset: asset ?? initAsset,
    marketData: marketData ?? initMarketData,
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
