import { Flex } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useSelector } from 'react-redux'
import { Redirect, useParams } from 'react-router-dom'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Page } from 'components/Layout/Page'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioAccountIdsSortedFiat } from 'state/slices/portfolioSlice/selectors'
export type MatchParams = {
  accountId: AccountSpecifier
  assetId: CAIP19
}

export const AccountToken = () => {
  const { accountId, assetId } = useParams<MatchParams>()

  /**
   * if the user switches the wallet while visiting this page,
   * the accountId is no longer valid for the app,
   * so we'll redirect user to the "accounts" page,
   * in order to choose the account from beginning.
   */
  const sortedAccountIds = useSelector(selectPortfolioAccountIdsSortedFiat)
  if (!sortedAccountIds.includes(accountId)) return <Redirect to='/accounts' />

  const caip19 = assetId ? decodeURIComponent(assetId) : null
  if (!caip19) return null
  return (
    <Page style={{ flex: 1 }} key={accountId}>
      <Flex role='main' flex={1} height='100%'>
        <AssetAccountDetails assetId={caip19} accountId={accountId} />
      </Flex>
    </Page>
  )
}
