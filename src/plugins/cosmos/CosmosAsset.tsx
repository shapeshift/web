import { Flex } from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import { Page } from 'components/Layout/Page'
import { LoadingAsset } from 'pages/Assets/LoadingAsset'
import { selectAssetById, selectMarketDataLoadingById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosAssetAccountDetails } from './CosmosAssetAccountDetails'

export type MatchParams = {
  assetSubId: string
  chainRef: string
}

export const CosmosAsset = () => {
  const { chainRef, assetSubId } = useParams<MatchParams>()
  const assetId = `cosmos:${chainRef}/${assetSubId}`
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetId))

  return !asset || loading ? (
    <Page key={asset?.assetId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <CosmosAssetAccountDetails assetId={asset.assetId} />
  )
}
