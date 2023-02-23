import type { ChainKey, LifiError, QuoteRequest, Step, TokensResponse } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, QuoteFeeData, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import type { LifiToolMeta } from 'lib/swapper/LifiSwapper/types'
import { DEFAULT_SOURCE } from 'lib/swapper/LifiSwapper/utils/constants'
import { convertPrecision } from 'lib/swapper/LifiSwapper/utils/convertPrecision/convertPrecision'
import { getMinimumAmountFromStep } from 'lib/swapper/LifiSwapper/utils/getMinimumAmountFromStep/getMinimumAmountFromStep'
import { selectPortfolioCryptoBalanceByFilter } from 'state/slices/common-selectors'
import { selectAccountIdByAccountNumberAndChainId } from 'state/slices/selectors'
import { store } from 'state/store'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiTokens: TokensResponse['tokens'],
  lifiChainMap: Map<number, ChainKey>,
  lifiToolMap: Map<string, Map<string, Map<string, LifiToolMeta>>>,
  lifi: LIFI,
): Promise<TradeQuote<EvmChainId>> {
  const {
    chainId,
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    sendMax,
    receiveAddress,
    accountNumber,
  } = input

  const fromLifiChainId = +fromChainId(sellAsset.chainId).chainReference
  const toLifiChainId = +fromChainId(buyAsset.chainId).chainReference
  const fromLifiChainKey = lifiChainMap.get(+fromChainId(sellAsset.chainId).chainReference)
  const toLifiChainKey = lifiChainMap.get(+fromChainId(buyAsset.chainId).chainReference)
  const fromLifiToken = lifiTokens[fromLifiChainId].find(token => token.symbol === sellAsset.symbol)
  const toLifiToken = lifiTokens[toLifiChainId].find(token => token.symbol === buyAsset.symbol)

  if (fromLifiChainKey === undefined || fromLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (toLifiChainKey === undefined || toLifiToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (fromLifiChainKey === toLifiChainKey) {
    throw new SwapError('[getTradeQuote] same chains swaps not supported', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
    })
  }

  const fromAmountLifi = (() => {
    if (sendMax) {
      const accountId = selectAccountIdByAccountNumberAndChainId(store.getState(), {
        accountNumber,
        chainId,
      })

      if (accountId === undefined) {
        throw new SwapError('[getTradeQuote] no account id found', {
          code: SwapErrorType.TRADE_QUOTE_FAILED,
        })
      }

      const balance = selectPortfolioCryptoBalanceByFilter(store.getState(), {
        accountId,
        assetId: sellAsset.assetId,
      })

      return convertPrecision(balance, sellAsset.precision, fromLifiToken.decimals).toString()
    }

    // TODO: remove this once minimum amounts are handled below
    const nonZeroAmount =
      sellAmountBeforeFeesCryptoBaseUnit === '0'
        ? bn(0.001).times(bn(10).exponentiatedBy(sellAsset.precision)).toString()
        : sellAmountBeforeFeesCryptoBaseUnit

    return convertPrecision(nonZeroAmount, sellAsset.precision, fromLifiToken.decimals).toString()
  })()

  // TODO: handle quotes that dont meet the minimum amount here

  const quoteRequest: QuoteRequest = {
    fromChain: fromLifiChainKey,
    toChain: toLifiChainKey,
    fromToken: fromLifiToken.symbol,
    toToken: toLifiToken.symbol,
    fromAddress: receiveAddress,
    toAddress: receiveAddress,
    fromAmount: fromAmountLifi,
    slippage: DEFAULT_SLIPPAGE,
  }

  const quote: Step = await lifi.getQuote(quoteRequest).catch((e: LifiError) => {
    const code = (() => {
      switch (e.code) {
        case LifiErrorCode.ValidationError:
          return SwapErrorType.VALIDATION_FAILED
        case LifiErrorCode.InternalError:
        case LifiErrorCode.Timeout:
          return SwapErrorType.RESPONSE_ERROR
        default:
          return SwapErrorType.TRADE_QUOTE_FAILED
      }
    })()
    throw new SwapError(`[getTradeQuote] ${e.message}`, { code })
  })

  const buyAssetTradeFeeUsd =
    quote.estimate.feeCosts
      ?.filter(feeData => feeData.name === 'Gas Fee')
      .reduce((acc, feeData) => acc.plus(bnOrZero(feeData.amount)), bn(0))
      .toString() ?? '0'
  const sellAssetTradeFeeUsd =
    quote.estimate.feeCosts
      ?.filter(feeData => feeData.name === 'Relay Fee')
      .reduce((acc, feeData) => acc.plus(bnOrZero(feeData.amount)), bn(0))
      .toString() ?? '0'

  const feeData: QuoteFeeData<EvmChainId> = {
    buyAssetTradeFeeUsd,
    sellAssetTradeFeeUsd,
    networkFeeCryptoBaseUnit: quote.estimate.data?.gasFeeInReceivingToken ?? '0',
    chainSpecific: {
      approvalFeeCryptoBaseUnit: '0',
      estimatedGas: quote.estimate.data?.gasFeeInReceivingToken ?? '0',
      totalFee: quote.estimate.data?.totalFee ?? '0',
      gasPriceCryptoBaseUnit:
        quote.transactionRequest?.gasPrice !== undefined
          ? bnOrZero(quote.transactionRequest?.gasPrice?.toString()).toString()
          : undefined,
    },
  }

  const minimumCryptoHuman = convertPrecision(
    getMinimumAmountFromStep(quote, lifiToolMap) ?? Infinity,
    fromLifiToken.decimals,
    0,
  ).toString()

  return {
    accountNumber,
    allowanceContract: quote.estimate.approvalAddress,
    buyAmountCryptoBaseUnit: bnOrZero(quote.estimate.toAmount).toString(),
    buyAsset,
    feeData,
    maximum: '0', // not used
    minimumCryptoHuman,
    rate: bnOrZero(quote.estimate.toAmount)
      .dividedBy(bnOrZero(quote.estimate.fromAmount))
      .toString(),
    recommendedSlippage: bnOrZero(quote.action.slippage).toString(),
    sellAmountBeforeFeesCryptoBaseUnit,
    sellAsset,
    sources: DEFAULT_SOURCE,
  }
}
