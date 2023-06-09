import type { Step } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { KnownChainIds } from '@shapeshiftoss/types'
import type { AbiItem } from 'web3-utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { isEvmChainAdapter } from 'lib/utils'
import { getWeb3InstanceByChainId } from 'lib/web3-instance'

import { OPTIMISM_GAS_ORACLE_ADDRESS } from '../constants'
import { getLifi } from '../getLifi'

export const getNetworkFeeCryptoBaseUnit = async ({
  chainId,
  lifiStep,
}: {
  chainId: ChainId
  lifiStep: Step
}) => {
  const lifi = getLifi()
  const adapter = getChainAdapterManager().get(chainId)

  if (adapter === undefined || !isEvmChainAdapter(adapter)) {
    throw new SwapError('[getNetworkFeeCryptoBaseUnit] invalid chain adapter', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
      details: { chainId },
    })
  }

  const { transactionRequest } = await lifi.getStepTransaction(lifiStep)
  const { value, from, to, data, gasLimit, gasPrice, maxFeePerGas } = transactionRequest ?? {}

  if (value === undefined || from === undefined || to === undefined || data === undefined) {
    throw new SwapError('[getNetworkFeeCryptoBaseUnit] getStepTransaction failed', {
      code: SwapErrorType.TRADE_QUOTE_FAILED,
    })
  }

  const gasFee = maxFeePerGas
    ? bn(maxFeePerGas as string)
    : bnOrZero(gasLimit as string).times(gasPrice as string)

  // TEMP: this is necessary because infura currently cannot estimate gas for some lifi contract
  // interactions, so instead of calling our existing stack which relies on infura we call the
  // optimism gas oracle directly.
  if (chainId === KnownChainIds.OptimismMainnet) {
    const optimismGasOracleAbi: AbiItem[] = [
      {
        inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
        name: 'getL1Fee',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ]
    const web3 = getWeb3InstanceByChainId(chainId)
    const tokenContract = new web3.eth.Contract(optimismGasOracleAbi, OPTIMISM_GAS_ORACLE_ADDRESS)
    const l1Fee = await tokenContract.methods.getL1Fee(data).call()

    return gasFee.plus(l1Fee).toString()
  }

  return gasFee.toString()
}
