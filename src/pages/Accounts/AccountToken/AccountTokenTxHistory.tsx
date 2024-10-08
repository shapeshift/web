import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

import type { MatchParams } from './AccountToken'

export const AccountTokenTxHistory: React.FC = () => {
  const { accountId, assetId } = useParams<MatchParams>()
  const assetIdParam = decodeURIComponent(assetId)
  const asset = useAppSelector(state => selectAssetById(state, assetIdParam))

  const assetHeader = useMemo(
    () => <AssetHeader assetId={assetIdParam} accountId={accountId} />,
    [accountId, assetIdParam],
  )
  return !asset ? null : (
    <Main titleComponent={assetHeader}>
      <AssetTransactionHistory
        assetId={assetIdParam}
        accountId={accountId}
        useCompactMode={false}
      />
    </Main>
  )
}
