import { getStepTransaction } from '@lifi/sdk'
import type { LiFiStep } from '@lifi/types'
import type { ChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { EvmChainId, KnownChainIds } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import { getContract } from 'viem'

import type { SwapperDeps } from '../../../../types'
import { configureLiFi } from '../configureLiFi'
import { L1_FEE_CHAIN_IDS, L1_GAS_ORACLE_ADDRESS } from '../constants'

type GetNetworkFeeArgs = {
  chainId: ChainId
  from: string | undefined
  lifiStep: LiFiStep
  supportsEIP1559: boolean
  deps: SwapperDeps
}

export const getNetworkFeeCryptoBaseUnit = async ({
  chainId,
  from,
  lifiStep,
  supportsEIP1559,
  deps,
}: GetNetworkFeeArgs) => {
  configureLiFi()
  const adapter = deps.assertGetEvmChainAdapter(chainId)

  const { average } = await adapter.getGasFeeData()

  try {
    if (!from) throw new Error('Cannot estimate fees without from')
    const { transactionRequest } = await getStepTransaction(lifiStep)
    if (!transactionRequest) throw new Error('transactionRequest is undefined')

    const { data, to, value } = transactionRequest

    if (data === undefined) throw new Error('transactionRequest: data is required')
    if (to === undefined) throw new Error('transactionRequest: to is required')
    if (value === undefined) throw new Error('transactionRequest: value is required')

    // Attempt own fees estimation if possible (approval granted, wallet connected with from addy to use for simulation)
    const feeData = await evm.getFees({
      adapter,
      data,
      to,
      value: bn(transactionRequest!.value!.toString()).toString(),
      from,
      supportsEIP1559,
    })
    return feeData.networkFeeCryptoBaseUnit
  } catch (err) {
    // Leverage Li.Fi (wrong) estimations if unable to roll our own
    const l1GasLimit = await (async () => {
      if (!L1_FEE_CHAIN_IDS.includes(chainId as KnownChainIds)) return

      const { transactionRequest } = await getStepTransaction(lifiStep)

      const { data, gasLimit } = transactionRequest ?? {}

      if (!data || !gasLimit) {
        throw new Error('getStepTransaction failed')
      }

      const publicClient = viemClientByChainId[chainId as EvmChainId]

      const abi = [
        {
          inputs: [{ internalType: 'bytes', name: '_data', type: 'bytes' }],
          name: 'getL1GasUsed',
          outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ]

      const contract = getContract({
        address: L1_GAS_ORACLE_ADDRESS,
        abi,
        client: {
          public: publicClient,
        },
      })

      const l1GasUsed = (await contract.read.getL1GasUsed([data])) as BigInt

      return l1GasUsed.toString()
    })()

    // aggregate all send gas estimations if available
    const estimatedGasLimit = lifiStep.estimate.gasCosts?.reduce<bigint | undefined>(
      (prev, gasCost) => {
        if (gasCost.type !== 'SEND') return prev
        if (prev === undefined) return BigInt(gasCost.estimate)
        return prev + BigInt(gasCost.estimate)
      },
      undefined,
    )

    if (!estimatedGasLimit) throw new Error('failed to get estimated gas limit')

    const networkFeeCryptoBaseUnit = evm.calcNetworkFeeCryptoBaseUnit({
      ...average,
      supportsEIP1559,
      gasLimit: estimatedGasLimit.toString(),
      l1GasLimit,
    })

    return networkFeeCryptoBaseUnit
  }
}
