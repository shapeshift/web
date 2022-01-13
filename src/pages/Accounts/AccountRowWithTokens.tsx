import { generatePath } from 'react-router'
import { AccountRow } from 'components/AccountRow/AccountRow'
import {
  AccountSpecifier,
  selectFeeAssetByAccountId
} from 'state/slices/portfolioSlice/portfolioSlice'

export const AccountRowWithTokens = ({ accountId }: { accountId: AccountSpecifier }) => {
  const nativeAssetId = selectFeeAssetByAccountId(accountId)
  const path = generatePath('/accounts/:accountId', {
    accountId
  })
  // @TODO: Replace this component with one that supports tokens
  return <AccountRow assetId={nativeAssetId} allocationValue={0} to={path} />
}
