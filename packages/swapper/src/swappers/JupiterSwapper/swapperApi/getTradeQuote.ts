import type { AssetId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  fromAssetId,
  solAssetId,
  toAssetId,
  wrappedSolAssetId,
} from '@shapeshiftoss/caip'
import type { GetFeeDataInput } from '@shapeshiftoss/chain-adapters'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero, convertDecimalPercentageToBasisPoints } from '@shapeshiftoss/utils'
import type { Result } from '@sniptt/monads'
import { Err, Ok } from '@sniptt/monads'
import { v4 as uuid } from 'uuid'

import { getDefaultSlippageDecimalPercentageForSwapper } from '../../../constants'
import type {
  CommonTradeQuoteInput,
  GetTradeRateInput,
  ProtocolFee,
  SwapErrorRight,
  SwapperDeps,
  TradeQuote,
  TradeRate,
} from '../../../types'
import { SwapperName, TradeQuoteError } from '../../../types'
import { getRate, makeSwapErrorRight } from '../../../utils'
import { getJupiterQuote, isSupportedChainId } from '../utils/helpers'

const _getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const {
    sellAsset,
    buyAsset,
    sellAmountIncludingProtocolFeesCryptoBaseUnit: sellAmount,
    affiliateBps,
    receiveAddress,
    accountNumber,
    slippageTolerancePercentageDecimal,
  } = input

  const { assetsById } = deps

  const jupiterUrl = deps.config.REACT_APP_JUPITER_API_URL

  if (!isSupportedChainId(sellAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  if (!isSupportedChainId(buyAsset.chainId)) {
    return Err(
      makeSwapErrorRight({
        message: `unsupported chainId`,
        code: TradeQuoteError.UnsupportedChain,
        details: { chainId: sellAsset.chainId },
      }),
    )
  }

  const maybeQuoteResponse = await getJupiterQuote({
    apiUrl: jupiterUrl,
    sourceAsset: sellAsset.assetId === solAssetId ? wrappedSolAssetId : sellAsset.assetId,
    destinationAsset: buyAsset.assetId === solAssetId ? wrappedSolAssetId : buyAsset.assetId,
    toAddress: receiveAddress,
    commissionBps: affiliateBps,
    amount: sellAmount,
    slippageBps: convertDecimalPercentageToBasisPoints(
      slippageTolerancePercentageDecimal ??
        getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
    ).toFixed(),
  })

  if (maybeQuoteResponse.isErr()) {
    return Err(
      makeSwapErrorRight({
        message: 'Quote request failed',
        code: TradeQuoteError.NoRouteFound,
      }),
    )
  }

  const { data: quoteResponse } = maybeQuoteResponse.unwrap()

  const getFeeData = async () => {
    const { chainNamespace } = fromAssetId(sellAsset.assetId)

    switch (chainNamespace) {
      case CHAIN_NAMESPACE.Solana: {
        const sellAdapter = deps.assertGetSolanaChainAdapter(sellAsset.chainId)
        const getFeeDataInput: GetFeeDataInput<KnownChainIds.SolanaMainnet> = {
          // Simulates a self-send, since we don't know the to just yet at this stage
          to: input.sendAddress!,
          value: sellAmount,
          chainSpecific: {
            from: input.sendAddress!,
            tokenId:
              sellAsset.assetId === solAssetId
                ? undefined
                : fromAssetId(sellAsset.assetId).assetReference,
          },
        }
        const { fast } = await sellAdapter.getFeeData(getFeeDataInput)
        return { networkFeeCryptoBaseUnit: fast.txFee }
      }

      default:
        throw new Error('Unsupported chainNamespace')
    }
  }

  const protocolFees: Record<AssetId, ProtocolFee> = quoteResponse.routePlan.reduce(
    (acc, route) => {
      const feeAssetId = toAssetId({
        assetReference: route.swapInfo.feeMint,
        assetNamespace: ASSET_NAMESPACE.splToken,
        chainNamespace: CHAIN_NAMESPACE.Solana,
        chainReference: CHAIN_REFERENCE.SolanaMainnet,
      })
      const feeAsset = assetsById[feeAssetId]

      // If we can't find the feeAsset, we can't provide a protocol fee to display
      // But these fees exists at protocol level, it's mostly to make TS happy as we should have the market data and assets
      if (!feeAsset) return acc

      acc[feeAssetId] = {
        requiresBalance: false,
        amountCryptoBaseUnit: bnOrZero(route.swapInfo.feeAmount).toString(),
        asset: feeAsset,
      }

      return acc
    },
    {} as Record<AssetId, ProtocolFee>,
  )

  const getQuoteRate = (sellAmountCryptoBaseUnit: string, buyAmountCryptoBaseUnit: string) => {
    return getRate({
      sellAmountCryptoBaseUnit,
      buyAmountCryptoBaseUnit,
      sellAsset,
      buyAsset,
    })
  }

  const quotes: TradeQuote[] = []

  const feeData = await getFeeData()

  const rate = getQuoteRate(quoteResponse.inAmount, quoteResponse.outAmount)

  const tradeQuote: TradeQuote = {
    id: uuid(),
    rate,
    receiveAddress,
    potentialAffiliateBps: affiliateBps,
    affiliateBps,
    isStreaming: false,
    rawQuote: quoteResponse,
    slippageTolerancePercentageDecimal:
      slippageTolerancePercentageDecimal ??
      getDefaultSlippageDecimalPercentageForSwapper(SwapperName.Jupiter),
    steps: [
      {
        buyAmountBeforeFeesCryptoBaseUnit: quoteResponse.outAmount,
        buyAmountAfterFeesCryptoBaseUnit: quoteResponse.outAmount,
        sellAmountIncludingProtocolFeesCryptoBaseUnit: quoteResponse.inAmount,
        feeData: {
          protocolFees,
          ...feeData,
        },
        rate,
        source: SwapperName.Jupiter,
        buyAsset,
        sellAsset,
        accountNumber,
        allowanceContract: '0x0',
        estimatedExecutionTimeMs: quoteResponse.timeTaken! * 1000,
      },
    ],
  }

  quotes.push(tradeQuote)

  return Ok(quotes)
}

export const getTradeRate = async (
  input: GetTradeRateInput,
  deps: SwapperDeps,
): Promise<Result<TradeRate[], SwapErrorRight>> => {
  const rates = await _getTradeQuote(input as unknown as CommonTradeQuoteInput, deps)
  return rates as Result<TradeRate[], SwapErrorRight>
}

export const getTradeQuote = async (
  input: CommonTradeQuoteInput,
  deps: SwapperDeps,
): Promise<Result<TradeQuote[], SwapErrorRight>> => {
  const { accountNumber } = input

  if (accountNumber === undefined) {
    return Err(
      makeSwapErrorRight({
        message: `accountNumber is required`,
        code: TradeQuoteError.UnknownError,
      }),
    )
  }

  const quotes = await _getTradeQuote(input, deps)
  return quotes
}
