import { useParams } from 'react-router-dom'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'

import { MatchParams } from './CosmosAsset'

export const CosmosAssetTxHistory = (props: { chainId: string }) => {
  const params = useParams<MatchParams>()
  const assetId = `${props.chainId}/${params.assetSubId}`
  if (!params.assetSubId && !props.chainId) return null

  return (
    <Main titleComponent={<AssetHeader assetId={assetId} />}>
      <AssetTransactionHistory assetId={assetId} useCompactMode={false} />
    </Main>
  )
}
