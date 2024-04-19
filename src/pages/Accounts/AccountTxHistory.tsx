import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { accountIdToFeeAssetId } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { MatchParams } from './Account'

export const AccountTxHistory: React.FC = () => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  const assetHeader = useMemo(
    () => <AssetHeader assetId={feeAssetId} accountId={accountId} />,
    [feeAssetId, accountId],
  )

  return !feeAsset ? null : (
    <Main titleComponent={assetHeader}>
      <AssetTransactionHistory accountId={accountId} useCompactMode={false} />
    </Main>
  )
}
