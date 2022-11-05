import type { AssetId } from '@keepkey/caip'
import { useParams } from 'react-router-dom'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosAssetAccountDetails } from './CosmosAssetAccountDetails'

export type MatchParams = {
  accountSubId: string
  assetId?: AssetId
}

export const CosmosAccount = () => {
  const { accountSubId } = useParams<MatchParams>()
  const accountId = `cosmos:${accountSubId}`
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))

  return feeAsset && <CosmosAssetAccountDetails assetId={feeAsset.assetId} accountId={accountId} />
}
