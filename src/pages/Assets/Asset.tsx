import type { ChainId } from '@shapeshiftoss/caip'
import { useParams } from 'react-router-dom'
import { Route } from 'Routes/helpers'
import { AssetAccountDetails } from 'components/AssetAccountDetails'
import { selectAssetByCAIP19 } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type MatchParams = {
  chainId: ChainId
  assetSubId: string
}

export const Asset = ({ route }: { route?: Route }) => {
  const params = useParams<MatchParams>()
  const assetId = `${params.chainId}/${params.assetSubId}`
  const asset = useAppSelector(state => selectAssetByCAIP19(state, assetId))
  return <AssetAccountDetails assetId={asset.caip19} route={route} />
}
