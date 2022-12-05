import { useParams } from 'react-router-dom'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { MatchParams } from './Account'

export const AccountTxHistory: React.FC = () => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  return !feeAsset ? null : (
    <Main titleComponent={<AssetHeader assetId={feeAssetId} accountId={accountId} />}>
      <AssetTransactionHistory assetId={feeAssetId} accountId={accountId} useCompactMode={false} />
    </Main>
  )
}
