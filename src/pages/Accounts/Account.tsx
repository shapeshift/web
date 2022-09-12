import { useParams } from 'react-router-dom'
import type { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import type { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type MatchParams = {
  accountId: AccountSpecifier
  assetId?: string
}

export const Account = ({ route }: { route?: Route }) => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))

  return (
    feeAsset && (
      <AssetAccountDetails assetId={feeAsset.assetId} accountId={accountId} route={route} />
    )
  )
}
