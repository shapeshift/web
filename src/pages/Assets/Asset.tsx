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
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  marketApi,
  selectMarketDataById,
  selectMarketDataLoadingById
} from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { LoadingAsset } from './LoadingAsset'
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
  const dispatch = useAppDispatch()

  const { chain, tokenId } = useParams<MatchParams>()
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const extra = tokenId ? { contractType, tokenId } : undefined
  const assetCAIP19 = caip19.toCAIP19({ chain, network, ...extra })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))

  // Many, but not all, assets are initialized with market data on app load. This dispatch will
  // ensure that those assets not initialized on app load will reach over the network and populate
  // the store with market data once a user visits that asset page.
  if (!marketData) dispatch(marketApi.endpoints.findByCaip19.initiate(assetCAIP19))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetCAIP19))

  return {
    asset: asset ?? initAsset,
    marketData: marketData ?? initMarketData,
    loading
  }
}

export const Asset = () => {
  const { asset, marketData } = useAsset()

  return !marketData ? (
    <Page style={{ flex: 1 }} key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <Page style={{ flex: 1 }} key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetAccountDetails assetId={asset.caip19} />
      </Flex>
    </Page>
  )
}
