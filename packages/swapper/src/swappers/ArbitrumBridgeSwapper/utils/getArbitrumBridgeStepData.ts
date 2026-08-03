import { fromChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr, makeTradeStepBuildFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { BRIDGE_TYPE } from '../types'
import { BRIDGE_TYPE_TO_FALLBACK_GAS_LIMIT } from './constants'
import { buildArbitrumBridgeRequest } from './helpers'

type BaseArgs = {
  bridgeType: BRIDGE_TYPE
  sellAmountCryptoBaseUnit: string
  buyAsset: Asset
  spenderAddress: string
}

export type GetArbitrumBridgeStepDataArgs = StepDataArgs<
  BaseArgs,
  unknown,
  { receiveAddress: string }
>

type ArbitrumBridgeRateStepData = {
  networkFeeCryptoBaseUnit: string
}

type ArbitrumBridgeQuoteStepData = {
  transactionData: TxBuildData
  networkFeeCryptoBaseUnit: string
}

export function getArbitrumBridgeStepData(
  args: Extract<GetArbitrumBridgeStepDataArgs, { type: 'rate' }>,
): Promise<Result<ArbitrumBridgeRateStepData, SwapErrorRight>>
export function getArbitrumBridgeStepData(
  args: Extract<GetArbitrumBridgeStepDataArgs, { type: 'quote' }>,
): Promise<Result<ArbitrumBridgeQuoteStepData, SwapErrorRight>>
export async function getArbitrumBridgeStepData(
  args: GetArbitrumBridgeStepDataArgs,
): Promise<Result<ArbitrumBridgeRateStepData | ArbitrumBridgeQuoteStepData, SwapErrorRight>> {
  const { input, deps, bridgeType, sellAmountCryptoBaseUnit, sellAsset, buyAsset, spenderAddress } =
    args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false
  const fallbackGasLimit = BRIDGE_TYPE_TO_FALLBACK_GAS_LIMIT[bridgeType].toFixed(0)

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      gasLimit: fallbackGasLimit,
    })

    const stepData: ArbitrumBridgeRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const { from, receiveAddress } = args

  const request = await buildArbitrumBridgeRequest({
    bridgeType,
    sellAmountCryptoBaseUnit,
    from,
    receiveAddress,
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
      from,
      supportsEIP1559,
      stateOverride: {
        sellAsset,
        sellAmountCryptoBaseUnit,
        spenderAddress,
      },
    })

    const stepData: ArbitrumBridgeQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getArbitrumBridgeStepData', error))
  }
}
