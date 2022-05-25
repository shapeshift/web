import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'

export const CosmosAssetTxHistory: React.FC = () => {
  const assetId = useRouteAssetId()
  if (!assetId) return null

  return (
    <Main titleComponent={<AssetHeader assetId={assetId} />}>
      <AssetTransactionHistory assetId={assetId} useCompactMode={false} />
    </Main>
  )
}
