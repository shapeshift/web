import { Flex } from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { LoadingAsset } from 'pages/Assets/LoadingAsset'
import { marketApi } from 'state/slices/marketDataSlice/marketDataSlice'
import {
  selectAssetByCAIP19,
  selectMarketDataById,
  selectMarketDataLoadingById
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { CosmosAssetAccountDetails } from './CosmosAssetAccountDetails'

export const CosmosAsset = (props: { chainId: string }) => {
  const dispatch = useAppDispatch()

  const { assetSubId } = useParams<{ assetSubId: string }>()
  const assetId = `${props.chainId}/${assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  if (!marketData) dispatch(marketApi.endpoints.findByCaip19.initiate(assetId))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetId))

  return !asset || loading ? (
    <Page style={{ flex: 1 }} key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <Page style={{ flex: 1 }} key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <CosmosAssetAccountDetails assetId={asset.caip19} />
      </Flex>
    </Page>
  )
}
