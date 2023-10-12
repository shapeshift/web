import type { EvmBaseAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { getConfig } from 'config'
import { IdleInvestor } from 'lib/investor/investor-idle'
import { assertGetEvmChainAdapter } from 'lib/utils/evm'

// don't export me, access me through the getter
let _idleInvestor: IdleInvestor | undefined = undefined

// we need to be able to access this outside react
export const getIdleInvestor = (): IdleInvestor => {
  if (_idleInvestor) return _idleInvestor

  const idleInvestor = new IdleInvestor({
    chainAdapter: assertGetEvmChainAdapter(
      KnownChainIds.EthereumMainnet,
    ) as EvmBaseAdapter<KnownChainIds.EthereumMainnet>,
    providerUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
  })

  _idleInvestor = idleInvestor

  return _idleInvestor
}
