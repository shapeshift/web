import { fromChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from '../../../utils/evm'
import type { KyberBuildData, KyberRouteSummary } from '../types'
import { KYBER_ROUTER_ADDRESS } from './constants'

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
  routeSummary: KyberRouteSummary
}

// Swap calldata is only built for quotes, rates price from the route alone
export type GetKyberStepDataArgs = StepDataArgs<
  BaseArgs,
  { build?: undefined },
  { build: KyberBuildData }
>

type KyberRateStepData = { networkFeeCryptoBaseUnit: string }
type KyberQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getKyberStepData(
  args: Extract<GetKyberStepDataArgs, { type: 'rate' }>,
): Promise<Result<KyberRateStepData, SwapErrorRight>>
export function getKyberStepData(
  args: Extract<GetKyberStepDataArgs, { type: 'quote' }>,
): Promise<Result<KyberQuoteStepData, SwapErrorRight>>
export async function getKyberStepData(
  args: GetKyberStepDataArgs,
): Promise<Result<KyberRateStepData | KyberQuoteStepData, SwapErrorRight>> {
  const { sellAsset, sellAmountCryptoBaseUnit, spenderAddress, routeSummary, input, deps } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmRateNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      providerGasLimit: routeSummary.gas,
    }).catch(() => bnOrZero(routeSummary.gas).times(bnOrZero(routeSummary.gasPrice)).toFixed(0))

    const stepData: KyberRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const { build, from } = args

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: KYBER_ROUTER_ADDRESS,
    data: build.data,
    value: build.transactionValue,
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      transactionData,
      from,
      stateOverride: { sellAsset, sellAmountCryptoBaseUnit, spenderAddress },
      providerGasLimit: build.gas,
    })

    const stepData: KyberQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getKyberStepData', error))
  }
}
