import { Flex } from '@chakra-ui/react'
import { CAIP19 } from '@shapeshiftoss/caip'
import { useSelector } from 'react-redux'
import { Redirect, useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { Main } from 'components/Layout/Main'
import { Page } from 'components/Layout/Page'
import { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectPortfolioAccountIdsSortedFiat } from 'state/slices/selectors'
export type MatchParams = {
  accountId: AccountSpecifier
  assetId: CAIP19
}

export const AccountToken = ({ route }: { route: Route }) => {
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
    <AssetAccountDetails assetId={caip19} accountId={accountId} route={route} key={accountId} />
  )
}
