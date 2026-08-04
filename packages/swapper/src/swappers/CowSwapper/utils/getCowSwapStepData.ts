import type { OrderCreation, OrderQuoteResponse } from '@shapeshiftoss/types'
import { BuyTokenDestination, SellTokenSource, SigningScheme } from '@shapeshiftoss/types'
import { bn } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Ok } from '@sniptt/monads'

import type { StepDataArgs, SwapErrorRight, TxBuildData } from '../../../types'

type CowSwapStepDataBase = {
  cowswapQuoteResponse: OrderQuoteResponse
  appDataHash: string
  buyAmountAfterFeesCryptoBaseUnit: string
}

export type GetCowSwapStepDataArgs = StepDataArgs<CowSwapStepDataBase>

type CowSwapRateStepData = { networkFeeCryptoBaseUnit: string }
type CowSwapQuoteStepData = { transactionData: TxBuildData; networkFeeCryptoBaseUnit: string }

export function getCowSwapStepData(
  args: Extract<GetCowSwapStepDataArgs, { type: 'rate' }>,
): Result<CowSwapRateStepData, SwapErrorRight>
export function getCowSwapStepData(
  args: Extract<GetCowSwapStepDataArgs, { type: 'quote' }>,
): Result<CowSwapQuoteStepData, SwapErrorRight>
export function getCowSwapStepData(
  args: GetCowSwapStepDataArgs,
): Result<CowSwapRateStepData | CowSwapQuoteStepData, SwapErrorRight> {
  // CowSwap is gasless - the solver pays execution, so there is no miner fee on either arm
  if (args.type === 'rate') {
    const stepData: CowSwapRateStepData = { networkFeeCryptoBaseUnit: '0' }

    return Ok(stepData)
  }

  const { sellAsset, cowswapQuoteResponse, appDataHash, buyAmountAfterFeesCryptoBaseUnit } = args
  const { id, quote } = cowswapQuoteResponse

  // The signed order deducts slippage and fees off buyAmount and folds protocol fees back into sellAmount -
  // this matches CoW's own minimum for the quote, else orders may take forever to fill or never fill
  const sellAmountPlusProtocolFees = bn(quote.sellAmount).plus(quote.feeAmount)

  const orderToSign: Omit<OrderCreation, 'signature'> = {
    ...quote,
    // CoW returns a quote with fees, but they must be zeroed out when sending the order
    feeAmount: '0',
    buyAmount: buyAmountAfterFeesCryptoBaseUnit,
    sellAmount: sellAmountPlusProtocolFees.toFixed(0),
    sellTokenBalance: SellTokenSource.ERC20,
    buyTokenBalance: BuyTokenDestination.ERC20,
    quoteId: id,
    appDataHash,
    signingScheme: SigningScheme.EIP712,
  }

  const transactionData: TxBuildData = {
    type: 'cowswap',
    chainId: sellAsset.chainId,
    orderToSign,
  }

  const stepData: CowSwapQuoteStepData = { transactionData, networkFeeCryptoBaseUnit: '0' }

  return Ok(stepData)
}
