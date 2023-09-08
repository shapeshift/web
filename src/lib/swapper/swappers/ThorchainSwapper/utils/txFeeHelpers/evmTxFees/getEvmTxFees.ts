import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { THOR_EVM_GAS_LIMIT } from 'lib/swapper/swappers/ThorchainSwapper/utils/constants'
import { calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'

type GetEvmTxFeesArgs = {
  adapter: EvmChainAdapter
  supportsEIP1559: boolean
}

type EvmTxFees = {
  networkFeeCryptoBaseUnit: string
}

export const getEvmTxFees = async (args: GetEvmTxFeesArgs): Promise<EvmTxFees> => {
  const { adapter, supportsEIP1559 } = args

  const { average } = await adapter.getGasFeeData()

  const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559,
    gasLimit: THOR_EVM_GAS_LIMIT, // hardcoded default for quote estimation (no wallet)
  })

  return { networkFeeCryptoBaseUnit }
}
