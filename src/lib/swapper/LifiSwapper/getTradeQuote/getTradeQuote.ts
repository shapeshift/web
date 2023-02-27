import type { ChainKey, LifiError, QuoteRequest, Step, Token } from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, QuoteFeeData, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { DEFAULT_SLIPPAGE } from 'constants/constants'
import { BigNumber, bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import type { LifiToolMeta } from 'lib/swapper/LifiSwapper/types'
import {
  DEFAULT_SOURCE,
  MIN_AMOUNT_THRESHOLD_USD_HUMAN,
} from 'lib/swapper/LifiSwapper/utils/constants'
import { getLifi } from 'lib/swapper/LifiSwapper/utils/getLifi'
import { getMinimumAmountFromStep } from 'lib/swapper/LifiSwapper/utils/getMinimumAmountFromStep/getMinimumAmountFromStep'
import { selectPortfolioCryptoBalanceByFilter } from 'state/slices/common-selectors'
import {
  selectAccountIdByAccountNumberAndChainId,
  selectMarketDataById,
} from 'state/slices/selectors'
import { store } from 'state/store'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  lifiTokens: Token[],
  lifiChainMap: Map<number, ChainKey>,
  lifiToolMap: Map<string, Map<string, Map<string, LifiToolMeta>>>,
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

  const fromLifiChainId = Number(fromChainId(sellAsset.chainId).chainReference)
  const toLifiChainId = Number(fromChainId(buyAsset.chainId).chainReference)
  const fromLifiChainKey = lifiChainMap.get(Number(fromChainId(sellAsset.chainId).chainReference))
  const toLifiChainKey = lifiChainMap.get(Number(fromChainId(buyAsset.chainId).chainReference))
  const fromLifiToken = lifiTokens.find(
    token => token.symbol === sellAsset.symbol && token.chainId === fromLifiChainId,
  )
  const toLifiToken = lifiTokens.find(
    token => token.symbol === buyAsset.symbol && token.chainId === toLifiChainId,
  )

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

  const fromAmountLifi: BigNumber = (() => {
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

      return convertPrecision(balance, sellAsset.precision, fromLifiToken.decimals)
    }

    return convertPrecision(
      sellAmountBeforeFeesCryptoBaseUnit,
      sellAsset.precision,
      fromLifiToken.decimals,
    )
  })()

  // handle quotes that dont meet the minimum amount
  const { price } = selectMarketDataById(store.getState(), sellAsset.assetId)
  const minimumAmountThresholdCryptoHuman = bn(MIN_AMOUNT_THRESHOLD_USD_HUMAN).dividedBy(price)
  const minimumAmountThresholdCryptoLifi = convertPrecision(
    minimumAmountThresholdCryptoHuman,
    0,
    sellAsset.precision,
  )

  // TODO: write a fat comment explaining why this is necessary
  const thresholdedAmountCryptoLifi = BigNumber.max(
    fromAmountLifi,
    minimumAmountThresholdCryptoLifi,
  )
    .integerValue()
    .toString()

  const quoteRequest: QuoteRequest = {
    fromChain: fromLifiChainKey,
    toChain: toLifiChainKey,
    fromToken: fromLifiToken.symbol,
    toToken: toLifiToken.symbol,
    fromAddress: receiveAddress,
    toAddress: receiveAddress,
    fromAmount: thresholdedAmountCryptoLifi,
    slippage: DEFAULT_SLIPPAGE,
  }

  const lifi = getLifi()

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
