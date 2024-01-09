import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapErrorType, SwapperName } from '@shapeshiftoss/swapper'
// import { isTradingActive } from 'components/MultiHopTrade/utils'
import { isSmartContractAddress } from 'lib/address/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { assertGetChainAdapter, isTruthy } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectWalletSupportedChainIds,
} from 'state/slices/common-selectors'
import {
  selectFeeAssetById,
  selectFirstHopSellAccountId,
  selectPortfolioAccountIdByNumberByChainId,
  selectSellAmountCryptoPrecision,
} from 'state/slices/selectors'
import { getTotalProtocolFeeByAssetForStep } from 'state/slices/tradeQuoteSlice/helpers'
import {
  selectSecondHopSellAccountId,
  selectSellAmountCryptoBaseUnit,
} from 'state/slices/tradeQuoteSlice/selectors'

import type { ErrorWithMeta } from '../types'
import { TradeQuoteError } from '../types'

export const validateTradeQuote = async (
  state: ReduxState,
  {
    swapperName,
    quote,
    error,
  }: {
    swapperName: SwapperName
    quote: TradeQuote | undefined
    error: SwapErrorRight | undefined
  },
): Promise<ErrorWithMeta<TradeQuoteError>[]> => {
  if (!quote || error) {
    const tradeQuoteError = (() => {
      switch (error?.code) {
        case SwapErrorType.UNSUPPORTED_PAIR:
          return TradeQuoteError.NoQuotesAvailableForTradePair
        case SwapErrorType.TRADING_HALTED:
          return TradeQuoteError.TradingHalted
        case SwapErrorType.TRADE_QUOTE_AMOUNT_TOO_SMALL:
          return TradeQuoteError.InputAmountTooSmall
        case SwapErrorType.TRADE_QUOTE_INPUT_LOWER_THAN_FEES:
          return TradeQuoteError.InputAmountLowerThanFees
        default:
          // We didn't recognize the error, use a generic error message
          return TradeQuoteError.UnknownError
      }
    })()

    return [{ error: tradeQuoteError }]
  }

  const isMultiHopTrade = quote.steps.length > 1
  const firstHop = quote.steps[0]
  const secondHop = quote.steps[1]
  const lastHop = isMultiHopTrade ? secondHop : firstHop
  const walletSupportedChains = selectWalletSupportedChainIds(state)
  const sellAmountCryptoPrecision = selectSellAmountCryptoPrecision(state)
  const sellAmountCryptoBaseUnit = selectSellAmountCryptoBaseUnit(state)
  const buyAmountCryptoBaseUnit = lastHop.buyAmountBeforeFeesCryptoBaseUnit

  // the network fee asset for the first hop in the trade
  const firstHopSellFeeAsset = selectFeeAssetById(state, firstHop.sellAsset.assetId)

  // the network fee asset for the second hop in the trade
  const secondHopSellFeeAsset = isMultiHopTrade
    ? selectFeeAssetById(state, secondHop.sellAsset.assetId)
    : undefined

  // this is the account we're selling from - network fees are paid from the sell account for the current hop
  const firstHopSellAccountId = selectFirstHopSellAccountId(state)
  const secondHopSellAccountId = selectSecondHopSellAccountId(state)

  const firstHopFeeAssetBalancePrecision = selectPortfolioCryptoPrecisionBalanceByFilter(state, {
    assetId: firstHopSellFeeAsset?.assetId,
    accountId: firstHopSellAccountId ?? '',
  })
  const secondHopFeeAssetBalancePrecision = isMultiHopTrade
    ? selectPortfolioCryptoPrecisionBalanceByFilter(state, {
        assetId: secondHopSellFeeAsset?.assetId,
        accountId: secondHopSellAccountId ?? '',
      })
    : undefined

  const networkFeeRequiresBalance = swapperName === SwapperName.CowSwap

  const firstHopNetworkFeeCryptoPrecision =
    networkFeeRequiresBalance && firstHopSellFeeAsset
      ? fromBaseUnit(
          bnOrZero(firstHop.feeData.networkFeeCryptoBaseUnit),
          firstHopSellFeeAsset.precision,
        )
      : bn(0).toFixed()

  const secondHopNetworkFeeCryptoPrecision =
    networkFeeRequiresBalance && secondHopSellFeeAsset
      ? fromBaseUnit(
          bnOrZero(secondHop.feeData.networkFeeCryptoBaseUnit),
          secondHopSellFeeAsset.precision,
        )
      : bn(0).toFixed()

  const firstHopTradeDeductionCryptoPrecision =
    firstHopSellFeeAsset?.assetId === firstHop.sellAsset.assetId
      ? bnOrZero(sellAmountCryptoPrecision).toFixed()
      : bn(0).toFixed()

  const walletSupportsIntermediaryAssetChain =
    !isMultiHopTrade || !walletSupportedChains.includes(firstHop.buyAsset.chainId)

  const firstHopHasSufficientBalanceForGas = bnOrZero(firstHopFeeAssetBalancePrecision)
    .minus(firstHopNetworkFeeCryptoPrecision ?? 0)
    .minus(firstHopTradeDeductionCryptoPrecision ?? 0)
    .gte(0)

  const secondHopHasSufficientBalanceForGas =
    !isMultiHopTrade ||
    bnOrZero(secondHopFeeAssetBalancePrecision)
      .minus(secondHopNetworkFeeCryptoPrecision ?? 0)
      .gte(0)

  const feesExceedsSellAmount =
    bnOrZero(sellAmountCryptoBaseUnit).isGreaterThan(0) &&
    bnOrZero(buyAmountCryptoBaseUnit).isLessThanOrEqualTo(0)

  const portfolioAccountIdByNumberByChainId = selectPortfolioAccountIdByNumberByChainId(state)
  const portfolioAccountBalancesBaseUnit = selectPortfolioAccountBalancesBaseUnit(state)
  const sellAssetAccountNumber = firstHop.accountNumber
  const totalProtocolFeesByAsset = getTotalProtocolFeeByAssetForStep(firstHop)

  // This is an oversimplification where protocol fees are assumed to be only deducted from
  // account IDs corresponding to the sell asset account number and protocol fee asset chain ID.
  // Later we'll need to handle protocol fees payable from the buy side.
  const insufficientBalanceForProtocolFeesErrors = Object.entries(totalProtocolFeesByAsset)
    .filter(([assetId, protocolFee]: [AssetId, ProtocolFee]) => {
      if (!protocolFee.requiresBalance) return false

      const accountId =
        portfolioAccountIdByNumberByChainId[sellAssetAccountNumber][protocolFee.asset.chainId]
      const balanceCryptoBaseUnit = portfolioAccountBalancesBaseUnit[accountId][assetId]
      return bnOrZero(balanceCryptoBaseUnit).lt(protocolFee.amountCryptoBaseUnit)
    })
    .map(([_assetId, protocolFee]: [AssetId, ProtocolFee]) => {
      return {
        error: TradeQuoteError.InsufficientFundsForProtocolFee,
        meta: {
          symbol: protocolFee.asset.symbol,
          chainName: assertGetChainAdapter(protocolFee.asset.chainId).getDisplayName(),
        },
      }
    })

  const recommendedMinimumCryptoBaseUnit = (quote as ThorTradeQuote)
    .recommendedMinimumCryptoBaseUnit
  const isUnsafeQuote =
    !recommendedMinimumCryptoBaseUnit ||
    bnOrZero(sellAmountCryptoBaseUnit).lt(recommendedMinimumCryptoBaseUnit)

  const disableSmartContractSwap = await (async () => {
    // Swappers other than THORChain shouldn't be affected by this limitation
    if (swapperName !== SwapperName.Thorchain) return false

    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    const _isSmartContractAddress = await isSmartContractAddress(quote.receiveAddress)
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  })()

  const [isTradingActiveOnSellPool, isTradingActiveOnBuyPool] = [true, true]

  // await Promise.all([
  //   isTradingActive(firstHop.sellAsset.assetId, swapperName),
  //   isTradingActive(firstHop.buyAsset.assetId, swapperName),
  // ])

  return [
    !!disableSmartContractSwap && {
      error: TradeQuoteError.SmartContractWalletNotSupported,
    },
    !isTradingActiveOnSellPool && {
      error: TradeQuoteError.TradingInactiveOnSellChain,
    },
    !isTradingActiveOnBuyPool && {
      error: TradeQuoteError.TradingInactiveOnBuyChain,
    },
    !walletSupportsIntermediaryAssetChain && {
      error: TradeQuoteError.IntermediaryAssetNotNotSupportedByWallet,
    },
    !firstHopHasSufficientBalanceForGas && {
      error: TradeQuoteError.InsufficientFirstHopFeeAssetBalance,
    },
    !secondHopHasSufficientBalanceForGas && {
      error: TradeQuoteError.InsufficientSecondHopFeeAssetBalance,
    },
    feesExceedsSellAmount && { error: TradeQuoteError.SellAmountBelowTradeFee },
    isUnsafeQuote && { error: TradeQuoteError.UnsafeQuote },
    ...insufficientBalanceForProtocolFeesErrors,
  ].filter(isTruthy)
}
