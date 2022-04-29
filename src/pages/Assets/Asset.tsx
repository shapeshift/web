import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { LoadingAsset } from './LoadingAsset'

export type MatchParams = {
  chainId: ChainId
  assetSubId: string
}

export const Asset = ({ route }: { route?: Route }) => {
  const params = useParams<MatchParams>()
  const assetId = `${params.chainId}/${params.assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))

  if (!asset)
    return (
      <Page>
        <Flex role='main' flex={1} height='100%'>
          <LoadingAsset />
        </Flex>
      </Page>
    )
  return <AssetAccountDetails assetId={asset.caip19} key={asset.caip19} route={route} />
}
