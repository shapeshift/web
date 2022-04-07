import { CAIP19 } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { CosmosAssetAccountDetails } from './CosmosAssetAccountDetails'

export type MatchParams = {
  accountSubId: string
  assetId?: CAIP19
}

export const CosmosAccount = () => {
  const { accountSubId } = useParams<MatchParams>()
  const accountId = `cosmos:${accountSubId}`
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))

  return feeAsset && <CosmosAssetAccountDetails assetId={feeAsset.caip19} accountId={accountId} />
}
