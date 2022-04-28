import { Flex } from '@chakra-ui/react'
import type { CAIP2 } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import { selectAssetByCAIP19, selectMarketDataById } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { LoadingAsset } from './LoadingAsset'
export interface MatchParams {
  chainId: CAIP2
  assetSubId: string
}

export const useAsset = () => {
  const dispatch = useAppDispatch()

  const params = useParams<MatchParams>()
  const assetId = `${params.chainId}/${params.assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  // Many, but not all, assets are initialized with market data on app load. This dispatch will
  // ensure that those assets not initialized on app load will reach over the network and populate
  // the store with market data once a user visits that asset page. We only dispatch if the query
  // has not already errored. Checking the query state here also distinguishes assets which are
  // missing market data from those where the request is pending.
  const { isLoading: loading, isError } = marketApi.endpoints.findByCaip19.useQueryState(assetId)
  if (!marketData && !isError) dispatch(marketApi.endpoints.findByCaip19.initiate(assetId))

  return {
    asset,
    marketData,
    loading,
  }
}

export const Asset = ({ route }: { route?: Route }) => {
  const { asset, loading } = useAsset()
  return loading ? (
    <Page key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <AssetAccountDetails assetId={asset.caip19} key={asset?.tokenId} route={route} />
  )
}
