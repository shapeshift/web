import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'
import type { Quote } from '@ston-fi/omniston-sdk'

import type { StepDataArgs, SwapErrorRight } from '../../../types'
import type { OmnistonAssetAddress, StonfiTransactionData } from '../types'
import { buildStonfiSpecific } from './helpers'

type BaseArgs = {
  quote: Quote
  bidAssetAddress: OmnistonAssetAddress
  askAssetAddress: OmnistonAssetAddress
}

// TON is un-migrated: the network fee is the provider gasBudget (no estimation), and the executable
// payload is stonfiTransactionData (exec builds the transfer from it), only carried on quotes
export type GetStonfiStepDataArgs = StepDataArgs<BaseArgs>

type StonfiRateStepData = { networkFeeCryptoBaseUnit: string }
type StonfiQuoteStepData = {
  networkFeeCryptoBaseUnit: string
  stonfiTransactionData: StonfiTransactionData
}

export function getStonfiStepData(
  args: Extract<GetStonfiStepDataArgs, { type: 'rate' }>,
): Result<StonfiRateStepData, SwapErrorRight>
export function getStonfiStepData(
  args: Extract<GetStonfiStepDataArgs, { type: 'quote' }>,
): Result<StonfiQuoteStepData, SwapErrorRight>
export function getStonfiStepData(
  args: GetStonfiStepDataArgs,
): Result<StonfiRateStepData | StonfiQuoteStepData, SwapErrorRight> {
  const { type, quote, bidAssetAddress, askAssetAddress } = args

  if (type === 'rate') {
    const stepData: StonfiRateStepData = { networkFeeCryptoBaseUnit: quote.gasBudget }

    return Ok(stepData)
  }

  const stepData: StonfiQuoteStepData = {
    networkFeeCryptoBaseUnit: quote.gasBudget,
    stonfiTransactionData: buildStonfiSpecific(quote, bidAssetAddress, askAssetAddress),
  }

  return Ok(stepData)
}
