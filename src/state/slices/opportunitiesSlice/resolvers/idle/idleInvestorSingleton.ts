import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { IdleInvestor } from 'lib/investor/investor-idle'

// don't export me, access me through the getter
let _idleInvestor: IdleInvestor | undefined = undefined

// we need to be able to access this outside react
export const getIdleInvestor = (): IdleInvestor => {
  if (_idleInvestor) return _idleInvestor

  const idleInvestor = new IdleInvestor({
    chainAdapter: getChainAdapterManager().get(
      KnownChainIds.EthereumMainnet,
    ) as ChainAdapter<KnownChainIds.EthereumMainnet>,
  })

  _idleInvestor = idleInvestor

  return _idleInvestor
}
