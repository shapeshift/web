import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getEvmNetworkFeeCryptoBaseUnit } from '../../../utils/evm'
import type { LcxLibertySwapTransaction } from '../types'

type BaseArgs = {
  sellAmountCryptoBaseUnit: string
  spenderAddress: string
  providerNetworkFeeCryptoBaseUnit: string | undefined
}

export type GetLcxLibertyStepDataArgs = StepDataArgs<
  BaseArgs,
  unknown,
  { transaction: LcxLibertySwapTransaction }
>

type LcxLibertyRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type LcxLibertyQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getLcxLibertyStepData(
  args: Extract<GetLcxLibertyStepDataArgs, { type: 'rate' }>,
): Promise<Result<LcxLibertyRateStepData, SwapErrorRight>>
export function getLcxLibertyStepData(
  args: Extract<GetLcxLibertyStepDataArgs, { type: 'quote' }>,
): Promise<Result<LcxLibertyQuoteStepData, SwapErrorRight>>
/**
 * Builds the step data for an LCX Liberty DEX trade.
 *
 * A rate has no transaction yet, so it carries only the network fee the provider estimated.
 * A quote turns the provider's transaction into EVM tx build data and prices its gas limit. Before
 * an approval the build has no gas limit, so it is estimated with the sell asset's balance and
 * allowance overridden.
 */
export async function getLcxLibertyStepData(
  args: GetLcxLibertyStepDataArgs,
): Promise<Result<LcxLibertyRateStepData | LcxLibertyQuoteStepData, SwapErrorRight>> {
  // Rates are priced without a build, so only the provider's fee is known
  if (args.type === 'rate') {
    const stepData: LcxLibertyRateStepData = {
      networkFeeCryptoBaseUnit: args.providerNetworkFeeCryptoBaseUnit,
    }

    return Ok(stepData)
  }

  const { transaction, sellAsset, sellAmountCryptoBaseUnit, spenderAddress, from, input, deps } =
    args

  const transactionData: TxBuildData = {
    type: 'evm',
    chainId: transaction.chainId,
    to: transaction.to,
    data: transaction.data,
    value: transaction.value,
    // Provider estimate with headroom for a maker that does not fill; absent before an approval
    gasLimit: transaction.gas || undefined,
  }

  try {
    const networkFeeCryptoBaseUnit = await getEvmNetworkFeeCryptoBaseUnit({
      adapter: deps.assertGetEvmChainAdapter(sellAsset.chainId),
      transactionData,
      from,
      supportsEIP1559: 'supportsEIP1559' in input ? input.supportsEIP1559 : false,
      stateOverride: { sellAsset, sellAmountCryptoBaseUnit, spenderAddress },
    })

    const stepData: LcxLibertyQuoteStepData = { transactionData, networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getLcxLibertyStepData', error))
  }
}
