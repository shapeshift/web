import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import toLower from 'lodash/toLower'
import { useSelector } from 'react-redux'
import { Redirect, useParams } from 'react-router-dom'
import type { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { selectWalletAccountIds } from 'state/slices/selectors'
export type MatchParams = {
  accountId: AccountId
  assetId: AssetId
}

type AccountTokenProps = {
  route?: Route
}

export const AccountToken = ({ route }: AccountTokenProps) => {
  const { accountId, assetId } = useParams<MatchParams>()

  /**
   * if the user switches the wallet while visiting this page,
   * the accountId is no longer valid for the app,
   * so we'll redirect user to the "accounts" page,
   * in order to choose the account from beginning.
   */
  const accountIds = useSelector(selectWalletAccountIds)
  const isCurrentAccountIdOwner = Boolean(accountIds.map(toLower).includes(toLower(accountId)))
  if (!accountIds.length) return null
  if (!isCurrentAccountIdOwner) return <Redirect to='/accounts' />

  const id = assetId ? decodeURIComponent(assetId) : null
  if (!id) return null
  return <AssetAccountDetails assetId={id} accountId={accountId} route={route} key={accountId} />
}
