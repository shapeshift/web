import { Flex } from '@chakra-ui/react'
import type { CAIP19 } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectMarketDataLoadingById
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { LoadingAsset } from './LoadingAsset'
export interface MatchParams {
  assetId: CAIP19
}

export const useAsset = () => {
  const dispatch = useAppDispatch()

  const params = useParams<MatchParams>()
  const assetId = decodeURIComponent(params.assetId)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

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

export const Asset = () => {
  const { asset, marketData } = useAsset()

  return !(asset && marketData) ? (
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
