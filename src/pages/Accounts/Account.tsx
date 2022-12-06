import type { AccountId } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import type { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type MatchParams = {
  accountId: AccountId
  assetId?: string
}

export const Account = ({ route }: { route?: Route }) => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  if (!feeAsset) return null

  return (
    feeAsset && (
      <AssetAccountDetails assetId={feeAsset.assetId} accountId={accountId} route={route} />
    )
  )
}
