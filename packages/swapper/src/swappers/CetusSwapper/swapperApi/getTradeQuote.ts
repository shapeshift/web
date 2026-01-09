import { Transaction } from '@cetusprotocol/aggregator-sdk/node_modules/@mysten/sui/transactions'
import { bnOrZero } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type { CommonTradeQuoteInput, SwapErrorRight, SwapperDeps, TradeQuote } from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { makeSwapErrorRight } from '../../../utils'
import { getAggregatorClient, getSuiClient } from '../utils/helpers'
import { getCetusTradeData } from './getCetusTradeData'

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    receiveAddress,
    accountNumber,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    slippageTolerancePercentageDecimal,
  } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.InternalError,
      }),
    )
  }

  const tradeDataResult = await getCetusTradeData(
    {
      sellAsset,
      buyAsset,
      receiveAddress,
      sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    },
    deps,
  )

  if (tradeDataResult.isErr()) return Err(tradeDataResult.unwrapErr())

  const {
    buyAmountAfterFeesCryptoBaseUnit,
    rate,
    addressForFeeEstimate,
    routerData,
    protocolFees,
    rpcUrl,
  } = tradeDataResult.unwrap()

  try {
    // Build the actual Cetus swap transaction to get accurate gas estimation
    const client = getAggregatorClient(rpcUrl)
    const suiClient = getSuiClient(rpcUrl)

    const slippage = bnOrZero(
      slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Cetus),
    ).toNumber()

    const txb = new Transaction()
    txb.setSender(addressForFeeEstimate)

    await client.fastRouterSwap({
      router: routerData,
      slippage,
      txb,
      refreshAllCoins: true,
    })

    const transactionBytes = await txb.build({ client: suiClient })

    const dryRunResult = await suiClient.dryRunTransactionBlock({
      transactionBlock: transactionBytes,
    })

    const computationCost = BigInt(dryRunResult.effects.gasUsed.computationCost)
    const storageCost = BigInt(dryRunResult.effects.gasUsed.storageCost)
    const storageRebate = BigInt(dryRunResult.effects.gasUsed.storageRebate)

    const netStorageCost = storageCost > storageRebate ? storageCost - storageRebate : 0n
    const estimatedGas = computationCost + netStorageCost

    const txFee = estimatedGas.toString()
    const gasBudget = ((estimatedGas * 120n) / 100n).toString()

    const gasPrice = await suiClient.getReferenceGasPrice()

    const tradeQuote: TradeQuote = {
      id: uuid(),
      quoteOrRate: 'quote',
      rate,
      affiliateBps,
      receiveAddress,
      slippageTolerancePercentageDecimal,
      swapperName: SwapperName.Cetus,
      steps: [
        {
          accountNumber,
          buyAmountBeforeFeesCryptoBaseUnit: buyAmountAfterFeesCryptoBaseUnit,
          buyAmountAfterFeesCryptoBaseUnit,
          sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
          feeData: {
            protocolFees,
            networkFeeCryptoBaseUnit: txFee,
            chainSpecific: {
              gasBudget,
              gasPrice: gasPrice.toString(),
            },
          },
          rate,
          source: SwapperName.Cetus,
          buyAsset,
          sellAsset,
          allowanceContract: '0x0',
          estimatedExecutionTimeMs: undefined,
        },
      ],
    }

    return tradeDataResult.map(() => [tradeQuote])
  } catch (error) {
    console.error(error)
    return Err(
      makeSwapErrorRight({
        message: error instanceof Error ? error.message : 'Unknown error getting Cetus quote',
        code: TradeQuoteError.QueryFailed,
      }),
    )
  }
}
