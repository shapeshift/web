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

import { EthereumAssetAccountDetails } from './EthereumAssetAccountDetails'

export const EthereumAsset = (props: { chainId: string }) => {
  const dispatch = useAppDispatch()

  const { assetSubId } = useParams<{ assetSubId: string }>()
  const assetId = `${props.chainId}/${assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  if (!marketData) dispatch(marketApi.endpoints.findByCaip19.initiate(assetId))

  const loading = useAppSelector(state => selectMarketDataLoadingById(state, assetId))

  return !asset || loading ? (
    <Page key={asset?.caip19}>
      <Flex role='main' flex={1} height='100%'>
        <LoadingAsset />
      </Flex>
    </Page>
  ) : (
    <EthereumAssetAccountDetails assetId={asset.caip19} />
  )
}
