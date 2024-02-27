import type { LifiStep } from '@lifi/types'
import type { ChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { ethers } from 'ethers'
import { getEthersProvider } from 'lib/ethersProviderSingleton'
import { assertGetEvmChainAdapter, calcNetworkFeeCryptoBaseUnit } from 'lib/utils/evm'

import { OPTIMISM_GAS_ORACLE_ADDRESS } from '../constants'
import { getLifi } from '../getLifi'

type GetNetworkFeeArgs = {
  chainId: ChainId
  lifiStep: LifiStep
  supportsEIP1559: boolean
}

export const getNetworkFeeCryptoBaseUnit = async ({
  chainId,
  lifiStep,
  supportsEIP1559,
}: GetNetworkFeeArgs) => {
  const lifi = getLifi()
  const adapter = assertGetEvmChainAdapter(chainId)

  const { transactionRequest } = await lifi.getStepTransaction(lifiStep)
  const { value, to, data, gasLimit } = transactionRequest ?? {}

  if (!value || !to || !data || !gasLimit) {
    throw new Error('getStepTransaction failed')
  }

  const { average } = await adapter.getGasFeeData()

  const l1GasLimit = await (async () => {
    if (chainId !== KnownChainIds.OptimismMainnet) return

    const provider = getEthersProvider(chainId as EvmChainId)

    const abi = [
      {
        inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
        name: 'getL1GasUsed',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ]

    const contract = new ethers.Contract(OPTIMISM_GAS_ORACLE_ADDRESS, abi, provider)

    const l1GasUsed = (await contract.getL1GasUsed(data)) as BigInt

    return l1GasUsed.toString()
  })()

  const networkFeeCryptoBaseUnit = calcNetworkFeeCryptoBaseUnit({
    ...average,
    supportsEIP1559,
    gasLimit: gasLimit?.toString(),
    l1GasLimit,
  })

  return networkFeeCryptoBaseUnit
}
