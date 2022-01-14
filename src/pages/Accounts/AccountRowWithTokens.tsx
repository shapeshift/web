import { Box } from '@chakra-ui/react'
import { AccountAssetsList } from 'components/AccountAssets/AccountAssetsList'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { Card } from 'components/Card/Card'
import {
  AccountSpecifier,
  selectFeeAssetIdByAccountId,
  selectPortfolioAssetIdsByAccountIdExcludeFeeAsset
} from 'state/slices/portfolioSlice/portfolioSlice'
import { useAppSelector } from 'state/store'

export const AccountRowWithTokens = ({ accountId }: { accountId: AccountSpecifier }) => {
  const nativeAssetId = selectFeeAssetIdByAccountId(accountId)
  const assetIds = useAppSelector(state =>
    selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, accountId)
  )
  return (
    <Card variant='outline'>
      <Card.Body>
        <Box mx={-4}>
          <AssetAccountRow assetId={nativeAssetId} accountId={accountId} />
        </Box>
      </Card.Body>
      {assetIds.length > 0 && (
        <Card.Footer pt={0}>
          <AccountAssetsList accountId={accountId} assetIds={assetIds} limit={0} />
        </Card.Footer>
      )}
    </Card>
  )
}
