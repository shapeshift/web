import { useParams } from 'react-router-dom'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'

import { MatchParams } from './CosmosAsset'

export type CosmosAssetTxHistoryProps = {
  chainId: string
}

export const CosmosAssetTxHistory: React.FC<CosmosAssetTxHistoryProps> = ({ chainId }) => {
  const params = useParams<MatchParams>()
  const assetId = `${chainId}/${params.assetSubId}`
  if (!params.assetSubId && !chainId) return null

  return (
    <Main titleComponent={<AssetHeader assetId={assetId} />}>
      <AssetTransactionHistory assetId={assetId} useCompactMode={false} />
    </Main>
  )
}
