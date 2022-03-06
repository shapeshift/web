import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AssetTransactionHistory } from 'components/TransactionHistory/AssetTransactionHistory'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

import { MatchParams } from './AccountToken'

type AssetTransactionProps = {
  route?: Route
}

export const AccountTokenTxHistory: React.FC<AssetTransactionProps> = ({ route }) => {
  const { accountId, assetId } = useParams<MatchParams>()
  const assetIdParam = decodeURIComponent(assetId)
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetIdParam))
  return !asset ? null : (
    <Main
      route={route}
      titleComponent={<AssetHeader assetId={assetIdParam} accountId={accountId} />}
    >
      <AssetTransactionHistory
        assetId={assetIdParam}
        accountId={accountId}
        useCompactMode={false}
      />
    </Main>
  )
}
