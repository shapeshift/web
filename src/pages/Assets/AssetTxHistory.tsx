import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AllTransactions } from 'components/Transactions/AllTransactions'

import { MatchParams } from './Asset'

type AssetTransactionProps = {
  route: Route
}

export const AssetTxHistory: React.FC<AssetTransactionProps> = ({ route }) => {
  const params = useParams<MatchParams>()
  const assetId = `${params.chainId}/${params.assetSubId}`
  if (!params.assetSubId && !params.chainId) return null

  return (
    <Main route={route} titleComponent={<AssetHeader assetId={assetId} />}>
      <AllTransactions assetId={assetId} />
    </Main>
  )
}
