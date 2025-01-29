import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'

import { THOR_EVM_GAS_LIMIT } from '../../ThorchainSwapper/utils/constants'

type GetEvmTxFeesArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
  sendAsset: string
}

export const getEvmTxFees = async (args: GetEvmTxFeesArgs): Promise<string> => {
  const { adapter, supportsEIP1559 } = args

  const { average } = await adapter.getGasFeeData()

  // That's not THOR but this should do the trick - overestimated effectively
  const gasLimit = THOR_EVM_GAS_LIMIT

  return evm.calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559,
    gasLimit,
  })
}
