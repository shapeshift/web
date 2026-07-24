import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getEvmNetworkFeeCryptoBaseUnit } from '../../../evm-utils'
import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeTradeStepBuildFailedErr } from '../../../utils'
import type { BRIDGE_TYPE } from '../types'
import { BRIDGE_TYPE_TO_FALLBACK_GAS_LIMIT } from './constants'
import { buildArbitrumBridgeRequest } from './helpers'

type BaseArgs = {
  bridgeType: BRIDGE_TYPE
  sellAmountCryptoBaseUnit: string
  buyAsset: Asset
}

export type GetArbitrumBridgeStepDataArgs = StepDataArgs<
  BaseArgs,
  unknown,
  { receiveAddress: string }
>

export const getArbitrumBridgeStepData = async (
  args: GetArbitrumBridgeStepDataArgs,
): Promise<
  Result<{ transactionData?: TxBuildData; networkFeeCryptoBaseUnit: string }, SwapErrorRight>
> => {
  const { input, deps, bridgeType, sellAmountCryptoBaseUnit, sellAsset, buyAsset } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false
  const fallbackGasLimit = BRIDGE_TYPE_TO_FALLBACK_GAS_LIMIT[bridgeType].toFixed(0)

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      gasLimit: fallbackGasLimit,
    })

    return Ok({ networkFeeCryptoBaseUnit })
  }

  const request = await buildArbitrumBridgeRequest({
    bridgeType,
    sellAmountCryptoBaseUnit,
    from: args.from,
    receiveAddress: args.receiveAddress,
    sellAsset,
    buyAsset,
  })

  if (!request) return Err(makeTradeStepBuildFailedErr('getArbitrumBridgeStepData', undefined))

  const { to, data, value } = request.txRequest

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to,
    data: data.toString(),
    value: value.toString(),
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      transactionData,
      from: args.from,
      supportsEIP1559,
    })

    return Ok({ transactionData, networkFeeCryptoBaseUnit })
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getArbitrumBridgeStepData', error))
  }
}
