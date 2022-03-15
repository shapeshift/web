import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetHeader } from 'components/AssetHeader/AssetHeader'
import { Main } from 'components/Layout/Main'
import { AllTransactions } from 'components/Transactions/AllTransactions'
import { accountIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { MatchParams } from './Account'

type AssetTransactionProps = {
  route?: Route
}

export const AccountTxHistory: React.FC<AssetTransactionProps> = ({ route }) => {
  const { accountId } = useParams<MatchParams>()
  const parsedAccountId = decodeURIComponent(accountId)
  const feeAssetId = accountIdToFeeAssetId(parsedAccountId)
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, feeAssetId))
  return !feeAsset ? null : (
    <Main titleComponent={<AssetHeader assetId={feeAssetId} accountId={accountId} />}>
      <AllTransactions assetId={feeAssetId} accountId={accountId} />
    </Main>
  )
}
