import { getStepTransaction } from '@lifi/sdk'
import type { LiFiStep } from '@lifi/types'
import type { ChainId } from '@shapeshiftoss/caip'
import { evm } from '@shapeshiftoss/chain-adapters'
import { viemClientByChainId } from '@shapeshiftoss/contracts'
import type { EvmChainId, KnownChainIds } from '@shapeshiftoss/types'
import { getContract } from 'viem'

import type { SwapperDeps } from '../../../../types'
import { configureLiFi } from '../configureLiFi'
import { L1_FEE_CHAIN_IDS, L1_GAS_ORACLE_ADDRESS } from '../constants'

type GetNetworkFeeArgs = {
  chainId: ChainId
  lifiStep: LiFiStep
  supportsEIP1559: boolean
  deps: SwapperDeps
}

export const getNetworkFeeCryptoBaseUnit = async ({
  chainId,
  lifiStep,
  supportsEIP1559,
  deps,
}: GetNetworkFeeArgs) => {
  configureLiFi()
  const adapter = deps.assertGetEvmChainAdapter(chainId)

  const { average } = await adapter.getGasFeeData()

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
