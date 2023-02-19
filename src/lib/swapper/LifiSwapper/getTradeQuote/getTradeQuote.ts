import type { ChainKey, LifiError, QuoteRequest, Step, Token, TokenAmount } from '@lifi/sdk'
import type LIFI from '@lifi/sdk'
import { LifiErrorCode } from '@lifi/sdk'
import { fromChainId } from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import type { GetEvmTradeQuoteInput, QuoteFeeData, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapError, SwapErrorType } from '@shapeshiftoss/swapper'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { DEFAULT_SOURCE } from 'lib/swapper/LifiSwapper/utils/constants'
import { convertPrecision } from 'lib/swapper/LifiSwapper/utils/convertPrecision/convertPrecision'

export async function getTradeQuote(
  input: GetEvmTradeQuoteInput,
  chainMap: Map<number, ChainKey>,
  tokenMap: Map<string, Pick<Token, 'decimals' | 'symbol'>>,
  lifi: LIFI,
): Promise<TradeQuote<EvmChainId>> {
  const {
    sellAsset,
    buyAsset,
    sellAmountBeforeFeesCryptoBaseUnit,
    sendMax,
    receiveAddress,
    accountNumber,
  } = input

  const fromChain = chainMap.get(+fromChainId(sellAsset.chainId).chainReference)
  const toChain = chainMap.get(+fromChainId(buyAsset.chainId).chainReference)
  const fromToken = tokenMap.get(sellAsset.symbol)
  const toToken = tokenMap.get(buyAsset.symbol)

  if (fromChain === undefined || fromToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${sellAsset.name}' on chainId '${sellAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (toChain === undefined || toToken === undefined) {
    throw new SwapError(
      `[getTradeQuote] asset '${buyAsset.name}' on chainId '${buyAsset.chainId}' not supported`,
      { code: SwapErrorType.UNSUPPORTED_PAIR },
    )
  }
  if (fromChain === toChain) {
    throw new SwapError('[getTradeQuote] same chains swaps not supported', {
      code: SwapErrorType.UNSUPPORTED_PAIR,
    })
  }

  // TODO:
  // @woodenfurniture: reached out to lifi to figure out how we can get the minimum trade amount for a given pair.
  // Currently only a minimum sell amount is given AFTER we fetch a quote,
  // and it seems to be "the minimum amount you'll get after fees", not "the minimum amount allowed for a swap".
  // Since the api cannot provide a quote without a valid amount higher than the minimum, this must be resolved.
  const minimumCryptoHuman = '1'

  let fromAmount = convertPrecision(
    sellAmountBeforeFeesCryptoBaseUnit,
    sellAsset.precision,
    fromToken.decimals,
  )

  if (sellAmountBeforeFeesCryptoBaseUnit === '0') {
    fromAmount = bn(minimumCryptoHuman).times(bn(10).exponentiatedBy(fromToken.decimals)).toString()
  }

  if (sendMax) {
    const token: Token = await lifi.getToken(fromChain, fromToken.symbol)
    const balance: TokenAmount | null = await lifi.getTokenBalance(receiveAddress, token)
    if (balance === null)
      throw new SwapError('[getTradeQuote]', { code: SwapErrorType.TRADE_QUOTE_FAILED })
    fromAmount = balance.amount
  }

  // return result.data
  const request: QuoteRequest = {
    fromChain,
    toChain,
    fromToken: fromToken.symbol,
    toToken: toToken.symbol,
    fromAddress: receiveAddress,
    toAddress: receiveAddress,
    fromAmount,
  }

  const quote: Step = await lifi.getQuote(request).catch((e: LifiError) => {
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

  const feeData: QuoteFeeData<EvmChainId> = {
    buyAssetTradeFeeUsd: '0',
    sellAssetTradeFeeUsd: '0',
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
