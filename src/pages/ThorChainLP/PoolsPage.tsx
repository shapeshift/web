import { ethAssetId, ethChainId } from '@shapeshiftoss/caip'
import { selectFirstAccountIdByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { useUserLpData } from './hooks/useUserLpData'

export const PoolsPage = () => {
  // TODO(gomes): for development only - remove me
  const defaultAccountId = useAppSelector(state => selectFirstAccountIdByChainId(state, ethChainId))

  const { data } = useUserLpData({ accountId: defaultAccountId, assetId: ethAssetId })

  console.log({ data })

  return <div>Coming soon</div>
}
