import { Flex } from '@chakra-ui/react'
<<<<<<< HEAD
import type { CAIP2 } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
=======
import { caip19 } from '@shapeshiftoss/caip'
import {
  Asset as A,
  AssetDataSource,
  ChainTypes,
  ContractTypes,
  MarketData,
  NetworkTypes
} from '@shapeshiftoss/types'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { assetStore, feedAssetStore } from 'state/slices/assetsSlice/assetStore'
>>>>>>> feat: dispatch set asset action to asset store
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectMarketDataLoadingById
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { LoadingAsset } from './LoadingAsset'
export interface MatchParams {
  chainId: CAIP2
  assetSubId: string
}

export const useAsset = () => {
  const dispatch = useAppDispatch()

<<<<<<< HEAD
  const params = useParams<MatchParams>()
  const assetId = `${params.chainId}/${params.assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))
=======
  const { chain, tokenId } = useParams<MatchParams>()
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const extra = tokenId ? { contractType, tokenId } : undefined
  const assetCAIP19 = caip19.toCAIP19({ chain, network, ...extra })
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetCAIP19))

  useEffect(() => {
    assetStore.dispatch(feedAssetStore(asset))
  }, [asset])

  const marketData = useAppSelector(state => selectMarketDataById(state, assetCAIP19))
>>>>>>> feat: dispatch set asset action to asset store

  // Many, but not all, assets are initialized with market data on app load. This dispatch will
  // ensure that those assets not initialized on app load will reach over the network and populate
  // the store with market data once a user visits that asset page.
  if (!marketData) dispatch(marketApi.endpoints.findByCaip19.initiate(assetId))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetId))

  return {
    asset,
    marketData,
    loading
  }
}

export const Asset = ({ route }: { route: Route }) => {
  const { asset, marketData } = useAsset()
  return !(asset && marketData) ? (
    <Page key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <AssetAccountDetails assetId={asset.caip19} key={asset?.tokenId} route={route} />
  )
}
