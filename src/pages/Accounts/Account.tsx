import { Flex } from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import {
  AccountSpecifier,
  selectFeeAssetByAccountId
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'
export interface MatchParams {
  accountId: AccountSpecifier
  assetId?: string
}

export const Account = () => {
  const { accountId } = useParams<MatchParams>()
  const nativeAssetId = selectFeeAssetByAccountId(accountId)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, nativeAssetId))
  return !asset ? null : (
    <Page style={{ flex: 1 }} key={asset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetAccountDetails caip19={asset.caip19} accountId={accountId} />
      </Flex>
    </Page>
  )
}
