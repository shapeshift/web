import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { AccountSpecifier } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type MatchParams = {
  accountId: AccountSpecifier
  assetId?: string
}

export const Account = ({ route }: { route?: Route }) => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))

  return (
    feeAsset && (
      <AssetAccountDetails assetId={feeAsset.caip19} accountId={accountId} route={route} />
    )
  )
}
