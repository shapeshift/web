import { useParams } from 'react-router-dom'
import { TxHistory } from 'components/TxHistory'

import { MatchParams } from './Asset'

export const Transactions = () => {
  const params = useParams<MatchParams>()
  return <TxHistory assetId={`${params.chainId}/${params.assetSubId}`} />
}
