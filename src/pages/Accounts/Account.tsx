import { Flex } from '@chakra-ui/react'
import { useParams } from 'react-router-dom'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'

export type MatchParams = {
  accountId: AccountSpecifier
  assetId?: string
}

export const Account = () => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))
  return !feeAsset ? null : (
    <Page style={{ flex: 1 }} key={feeAsset?.tokenId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetAccountDetails assetId={feeAsset.caip19} accountId={accountId} />
      </Flex>
    </Page>
  )
}
