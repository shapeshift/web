import type { Step } from '@lifi/sdk'
import type { ChainId } from '@shapeshiftoss/caip'
import { optimism } from '@shapeshiftoss/chain-adapters'
import { getConfig } from 'config'
import Web3 from 'web3'
import type { AbiItem } from 'web3-utils'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { SwapError, SwapErrorType } from 'lib/swapper/api'
import { getFeesFromContractData } from 'lib/swapper/swappers/utils/helpers/helpers'
import { isEvmChainAdapter } from 'lib/utils'

import { getLifi } from '../getLifi'

export const getNetworkFeeCryptoBaseUnit = async ({
  chainId,
  lifiStep,
  eip1559Support,
}: {
  chainId: ChainId
  lifiStep: Step
  eip1559Support: boolean
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

  // TEMP: this is necessary because infura currently cannot estimate gas for some lifi contract
  // interactions, so instead of calling our existing stack which relies on infura we call the
  // optimism gas oracle directly.
  if (optimism.isOptimismChainAdapter(adapter)) {
    const provider = new Web3.providers.HttpProvider(getConfig().REACT_APP_OPTIMISM_NODE_URL)
    const optimismGasOracleAddress = '0x420000000000000000000000000000000000000f'
    const optimismGasOracleAbi: AbiItem[] = [
      {
        inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
        name: 'getL1Fee',
        outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      },
    ]
    const web3 = new Web3(provider)
    const tokenContract = new web3.eth.Contract(optimismGasOracleAbi, optimismGasOracleAddress)
    const l1Fee = await tokenContract.methods.getL1Fee(data).call()
    const gasFee = maxFeePerGas
      ? bn(maxFeePerGas as string)
      : bnOrZero(gasLimit as string).times(gasPrice as string)
    return gasFee.plus(l1Fee).toString()
  }

  const { networkFeeCryptoBaseUnit } = await getFeesFromContractData({
    eip1559Support,
    adapter,
    from,
    to,
    value: bn(value as string, 16).toString(),
    data: data.toString(),
  })

  return networkFeeCryptoBaseUnit
}
