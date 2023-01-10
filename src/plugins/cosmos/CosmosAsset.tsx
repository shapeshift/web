import { Flex } from '@chakra-ui/react'
import { fromAssetId } from '@shapeshiftoss/caip'
import { Page } from 'components/Layout/Page'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { LoadingAsset } from 'pages/Assets/LoadingAsset'
import { selectAssetById, selectMarketDataLoadingById } from 'state/slices/selectors'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosAssetAccountDetails } from './CosmosAssetAccountDetails'

export const CosmosAsset = () => {
  const assetId = useRouteAssetId()
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetId ?? ''))

  const chainId = fromAssetId(asset.assetId)
  const accountId = useAppSelector(state => selectFirstAccountIdByChainId(state, chainId))

  return !asset || loading ? (
    <Page key={asset?.assetId}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <CosmosAssetAccountDetails chainId={asset.chainId} assetId={asset.assetId} accountId={accountId} />
  )
}
