import { fromChainId } from '@shapeshiftoss/caip'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import {
  getEvmNetworkFeeCryptoBaseUnit,
  getEvmRateNetworkFeeCryptoBaseUnit,
} from '../../../utils/evm'
import type { KyberBuildData } from '../types'
import { getKyberProviderNetworkFeeCryptoBaseUnit } from './helpers'

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
  providerGasLimit: string
  providerGasPrice: string
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
  const {
    sellAsset,
    sellAmountCryptoBaseUnit,
    spenderAddress,
    providerGasLimit,
    providerGasPrice,
    input,
    deps,
  } = args

  const adapter = deps.assertGetEvmChainAdapter(sellAsset.chainId)
  const supportsEIP1559 = 'supportsEIP1559' in input ? input.supportsEIP1559 : false

  if (args.type === 'rate') {
    const networkFeeCryptoBaseUnit = await getEvmRateNetworkFeeCryptoBaseUnit({
      adapter,
      supportsEIP1559,
      providerGasLimit,
    }).catch(() =>
      getKyberProviderNetworkFeeCryptoBaseUnit({
        gas: providerGasLimit,
        gasPrice: providerGasPrice,
      }),
    )

    const stepData: KyberRateStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  }

  const { build, from } = args

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: Number(fromChainId(sellAsset.chainId).chainReference),
    to: build.routerAddress,
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
