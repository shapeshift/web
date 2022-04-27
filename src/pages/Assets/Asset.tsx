import { Flex } from '@chakra-ui/react'
import type { CAIP2 } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectMarketDataLoadingById,
  selectMarketDataUnavailableById,
} from 'state/slices/selectors'
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
  const unavailable = useAppSelector(state => selectMarketDataUnavailableById(state, assetId))

  // Many, but not all, assets are initialized with market data on app load. This dispatch will
  // ensure that those assets not initialized on app load will reach over the network and populate
  // the store with market data once a user visits that asset page.
  if (!marketData) dispatch(marketApi.endpoints.findByCaip19.initiate(assetId))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetId))

  return {
    asset,
    marketData,
    loading,
    unavailable,
  }
}

export const Asset = ({ route }: { route?: Route }) => {
  const { asset, marketData, unavailable } = useAsset()

  // If the API request has completed successfully, marketData will be set. If it failed, unavailable will be set.
  // In either case, child components can select data/errors from state and decide what to display. If neither is set,
  // the request must still be in progress, so display the loading component.
  return asset && (marketData || unavailable) ? (
    <AssetAccountDetails assetId={asset.caip19} key={asset?.tokenId} route={route} />
  ) : (
    <Page key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  )
}
