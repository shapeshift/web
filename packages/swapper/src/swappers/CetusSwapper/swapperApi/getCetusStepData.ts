import type { RouterDataV3 } from '@cetusprotocol/aggregator-sdk'
import { Transaction } from '@mysten/sui/transactions'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { StepDataArgs, SwapErrorRight } from '../../../types'
import { SwapperName } from '../../../types'
import { makeNetworkFeeEstimationFailedErr } from '../../../utils'
import { getAggregatorClient, getSuiClient } from '../utils/helpers'

type BaseArgs = {
  routerData: RouterDataV3
  rpcUrl: string
  slippageTolerancePercentageDecimal: string | undefined
}

// Sui is un-migrated - exec re-derives the route, so step data is fee-only for both arms.
// from is the dry-run sender and required on both arms (rate supplies a dummy sender walletless).
export type GetCetusStepDataArgs = StepDataArgs<BaseArgs, { from: string }>

type CetusRateStepData = { networkFeeCryptoBaseUnit: string | undefined }
type CetusQuoteStepData = { networkFeeCryptoBaseUnit: string }

export function getCetusStepData(
  args: Extract<GetCetusStepDataArgs, { type: 'rate' }>,
): Promise<Result<CetusRateStepData, SwapErrorRight>>
export function getCetusStepData(
  args: Extract<GetCetusStepDataArgs, { type: 'quote' }>,
): Promise<Result<CetusQuoteStepData, SwapErrorRight>>
export async function getCetusStepData(
  args: GetCetusStepDataArgs,
): Promise<Result<CetusRateStepData | CetusQuoteStepData, SwapErrorRight>> {
  const { routerData, rpcUrl, slippageTolerancePercentageDecimal, from } = args

  const client = getAggregatorClient(rpcUrl)
  const suiClient = getSuiClient(rpcUrl)

  const slippage = bnOrZero(
    slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Cetus),
  ).toNumber()

  // Build the actual Cetus swap transaction and dry-run it for an accurate gas estimate
  const estimateNetworkFeeCryptoBaseUnit = async (): Promise<string> => {
    const txb = new Transaction()
    txb.setSender(from)

    await client.fastRouterSwap({ router: routerData, slippage, txb, refreshAllCoins: true })

    const transactionBytes = await txb.build({ client: suiClient })
    const dryRunResult = await suiClient.dryRunTransactionBlock({
      transactionBlock: transactionBytes,
    })

    const computationCost = BigInt(dryRunResult.effects.gasUsed.computationCost)
    const storageCost = BigInt(dryRunResult.effects.gasUsed.storageCost)
    const storageRebate = BigInt(dryRunResult.effects.gasUsed.storageRebate)
    const netStorageCost = storageCost > storageRebate ? storageCost - storageRebate : 0n

    return (computationCost + netStorageCost).toString()
  }

  if (args.type === 'rate') {
    try {
      const networkFeeCryptoBaseUnit = await estimateNetworkFeeCryptoBaseUnit()

      const stepData: CetusRateStepData = { networkFeeCryptoBaseUnit }

      return Ok(stepData)
    } catch (error) {
      // Walletless rates have no coins to dry-run against - degrade to an unknown fee, but a real route/build error still fails
      if (error instanceof Error && error.message.includes('Not enough coins of type')) {
        const stepData: CetusRateStepData = { networkFeeCryptoBaseUnit: undefined }

        return Ok(stepData)
      }

      return Err(makeNetworkFeeEstimationFailedErr('getCetusStepData', error))
    }
  }

  try {
    const networkFeeCryptoBaseUnit = await estimateNetworkFeeCryptoBaseUnit()

    const stepData: CetusQuoteStepData = { networkFeeCryptoBaseUnit }

    return Ok(stepData)
  } catch (error) {
    return Err(makeNetworkFeeEstimationFailedErr('getCetusStepData', error))
  }
}
