import { useParams } from 'react-router-dom'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'

import { MatchParams } from './CosmosAsset'

export const CosmosAssetTxHistory: React.FC = () => {
  const { chainRef, assetSubId } = useParams<MatchParams>()
  const assetId = `cosmos:${chainRef}/${assetSubId}`
  if (!assetSubId && !chainRef) return null

  return (
    <Main titleComponent={<AssetHeader assetId={assetId} />}>
      <AssetTransactionHistory assetId={assetId} useCompactMode={false} />
    </Main>
  )
}
