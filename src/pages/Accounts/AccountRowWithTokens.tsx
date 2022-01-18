import { Box } from '@chakra-ui/react'
import { AccountAssetsList } from 'components/AccountAssets/AccountAssetsList'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { Card } from 'components/Card/Card'
import {
  AccountSpecifier,
  selectPortfolioAssetIdsByAccountIdExcludeFeeAsset
} from 'state/slices/portfolioSlice/portfolioSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'

type AccountRowWithTokensProps = {
  accountId: AccountSpecifier
}

export const AccountRowWithTokens = ({ accountId }: AccountRowWithTokensProps) => {
  const nativeAssetId = accountIdToFeeAssetId(accountId)
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
