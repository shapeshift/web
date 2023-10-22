import { useMemo } from 'react'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'

export const AssetTxHistory: React.FC = () => {
  const assetId = useRouteAssetId()
  const assetHeader = useMemo(() => <AssetHeader assetId={assetId} />, [assetId])

  if (!assetId) return null

  return (
    <Main titleComponent={assetHeader}>
      <AssetTransactionHistory assetId={assetId} useCompactMode={false} />
    </Main>
  )
}
