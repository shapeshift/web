import type { LifiStep } from '@lifi/types'
import type { ChainId } from '@shapeshiftoss/caip'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { BigNumber } from 'ethers'
import { ethers } from 'ethers'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn } from 'lib/bignumber/bignumber'
import { getEthersProvider } from 'lib/ethersProviderSingleton'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { calcNetworkFeeCryptoBaseUnit, getFees, isEvmChainAdapter } from 'lib/utils/evm'

import { OPTIMISM_GAS_ORACLE_ADDRESS } from '../constants'
import { getLifi } from '../getLifi'

type GetNetworkFeeArgs = {
  accountNumber: number
  chainId: ChainId
  lifiStep: LifiStep
  supportsEIP1559: boolean
  wallet?: HDWallet
}

export const getNetworkFeeCryptoBaseUnit = async ({
  accountNumber,
  chainId,
  lifiStep,
  supportsEIP1559,
  wallet,
}: GetNetworkFeeArgs) => {
  const lifi = getLifi()
  const adapter = getChainAdapterManager().get(chainId)

  if (!isEvmChainAdapter(adapter)) {
    throw new SwapError('[getNetworkFeeCryptoBaseUnit] - unsupported chain adapter', {
      code: SwapErrorType.VALIDATION_FAILED,
      details: { chainId },
    })
  }

  const { transactionRequest } = await lifi.getStepTransaction(lifiStep)
  const { value, to, data, gasLimit } = transactionRequest ?? {}

  if (!value || !to || !data || !gasLimit) {
    throw new SwapError('[getNetworkFeeCryptoBaseUnit] getStepTransaction failed', {
      code: SwapErrorType.VALIDATION_FAILED,
    })
  }

  // if we have a wallet, we are trying to build the actual trade, get accurate gas estimation
  if (wallet) {
    const { networkFeeCryptoBaseUnit } = await getFees({
      accountNumber,
      adapter,
      to,
      data: data.toString(),
      value: bn(value.toString()).toFixed(),
      wallet,
    })

    return networkFeeCryptoBaseUnit
  }

  const { average } = await adapter.getGasFeeData()

  const l1GasLimit = await (async () => {
    if (chainId !== KnownChainIds.OptimismMainnet) return

    const provider = getEthersProvider(chainId)

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

    const l1GasUsed = (await contract.getL1GasUsed(data)) as BigNumber

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
