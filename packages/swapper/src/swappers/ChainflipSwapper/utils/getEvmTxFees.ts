import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'

import { getGasLimit } from './helpers'

type GetEvmTxFeesArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
  sendAsset: string
}

export const getEvmTxFees = async (args: GetEvmTxFeesArgs): Promise<string> => {
  const { adapter, supportsEIP1559 } = args

  const { average } = await adapter.getGasFeeData()

  const gasLimit = getGasLimit(args.sendAsset)

  return evm.calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559,
    gasLimit,
  })
}
