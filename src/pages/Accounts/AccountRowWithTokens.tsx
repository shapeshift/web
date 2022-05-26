import { Box } from '@chakra-ui/react'
import { AccountAssetsList } from 'components/AccountAssets/AccountAssetsList'
import { AssetAccountRow } from 'components/AssetAccounts/AssetAccountRow'
import { Card } from 'components/Card/Card'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { selectPortfolioAssetIdsByAccountIdExcludeFeeAsset } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AccountRowWithTokensProps = {
  accountId: AccountSpecifier
}

export const AccountRowWithTokens = ({ accountId }: AccountRowWithTokensProps) => {
  const assetIds = useAppSelector(state =>
    selectPortfolioAssetIdsByAccountIdExcludeFeeAsset(state, { accountId }),
  )
  return (
    <Card variant='outline'>
      <Card.Body>
        <Box mx={-4}>
          <AssetAccountRow accountId={accountId} />
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
