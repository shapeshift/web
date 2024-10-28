import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { evm } from '@shapeshiftoss/chain-adapters'

import { assetGasLimits } from '../constants'

type GetEvmTxFeesArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean,
  sendAsset: string
}

export const getEvmTxFees = async (args: GetEvmTxFeesArgs): Promise<string> => {
  const { adapter, supportsEIP1559 } = args

  const { average } = await adapter.getGasFeeData()

  const gasLimit = (args.sendAsset in assetGasLimits) ? assetGasLimits[args.sendAsset]! : '100000'
  
  return evm.calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559,
    gasLimit
  })
}
