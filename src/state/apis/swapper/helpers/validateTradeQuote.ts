import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import {
  getHopByIndex,
  SwapperName,
  TradeQuoteError as SwapperTradeQuoteError,
} from '@shapeshiftoss/swapper'
import type { ThorTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/types'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { isMultiHopTradeQuote } from 'components/MultiHopTrade/utils'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { assertGetChainAdapter, assertUnreachable, isTruthy } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectWalletConnectedChainIds,
  selectWalletId,
} from 'state/slices/common-selectors'
import {
  selectAssets,
  selectFeeAssetById,
  selectPortfolioAccountIdByNumberByChainId,
} from 'state/slices/selectors'
import {
  selectFirstHopSellAccountId,
  selectInputSellAmountCryptoPrecision,
  selectSecondHopSellAccountId,
} from 'state/slices/tradeInputSlice/selectors'
import { getTotalProtocolFeeByAssetForStep } from 'state/slices/tradeQuoteSlice/helpers'

import type { ErrorWithMeta, TradeQuoteError } from '../types'
import { TradeQuoteValidationError, TradeQuoteWarning } from '../types'

export const validateTradeQuote = (
  state: ReduxState,
  {
    swapperName,
    quote,
    error,
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
    sendAddress,
    inputSellAmountCryptoBaseUnit,
    quoteOrRate,
  }: {
    swapperName: SwapperName
    quote: TradeQuote | undefined
    error: SwapErrorRight | undefined
    isTradingActiveOnSellPool: boolean
    isTradingActiveOnBuyPool: boolean
    // TODO(gomes): this should most likely live in the quote alongside the receiveAddress,
    // summoning @woodenfurniture WRT implications of that, this works for now
    sendAddress: string | undefined
    inputSellAmountCryptoBaseUnit: string
    quoteOrRate: 'quote' | 'rate'
  },
): {
  errors: ErrorWithMeta<TradeQuoteError>[]
  warnings: ErrorWithMeta<TradeQuoteWarning>[]
} => {
  if (!quote || error) {
    const tradeQuoteError = (() => {
      const errorCode = error?.code
      switch (errorCode) {
        case SwapperTradeQuoteError.UnsupportedChain:
        case SwapperTradeQuoteError.CrossChainNotSupported:
        case SwapperTradeQuoteError.NetworkFeeEstimationFailed:
        case SwapperTradeQuoteError.QueryFailed:
        case SwapperTradeQuoteError.InternalError:
        case SwapperTradeQuoteError.UnsupportedTradePair:
        case SwapperTradeQuoteError.NoRouteFound:
        case SwapperTradeQuoteError.TradingHalted:
        case SwapperTradeQuoteError.SellAmountBelowTradeFee:
        case SwapperTradeQuoteError.RateLimitExceeded:
        case SwapperTradeQuoteError.InvalidResponse:
          // no metadata associated with this error
          return { error: errorCode }
        case SwapperTradeQuoteError.SellAmountBelowMinimum: {
          const {
            minAmountCryptoBaseUnit,
            assetId,
          }: { minAmountCryptoBaseUnit?: string; assetId?: AssetId } = error?.details ?? {}

          const assetsById = selectAssets(state)
          const asset = assetId && assetsById[assetId]

          if (!minAmountCryptoBaseUnit || !asset) {
            return {
              error: SwapperTradeQuoteError.SellAmountBelowMinimum,
            }
          }

          const minAmountCryptoHuman = fromBaseUnit(minAmountCryptoBaseUnit, asset.precision)
          const formattedAmount = bnOrZero(minAmountCryptoHuman).decimalPlaces(6)
          const minimumAmountUserMessage = `${formattedAmount} ${asset.symbol}`

          return {
            error: SwapperTradeQuoteError.SellAmountBelowMinimum,
            meta: { minLimit: minimumAmountUserMessage },
          }
        }
        case SwapperTradeQuoteError.UnknownError:
        case undefined:
          // We didn't recognize the error, use a generic error message
          return { error: SwapperTradeQuoteError.UnknownError }
        default:
          assertUnreachable(errorCode)
      }
    })()

    return { errors: [tradeQuoteError], warnings: [] }
  }

  // This should really never happen in case the wallet *is* connected but in case it does:
  if (quoteOrRate === 'quote' && !sendAddress) throw new Error('sendAddress is required')

  // If we have a walletId at the time we hit this, we have a wallet. Else, none is connected, meaning we shouldn't surface balance errors
  const walletId = selectWalletId(state)

  // A quote always consists of at least one hop
  const firstHop = getHopByIndex(quote, 0)!
  const secondHop = getHopByIndex(quote, 1)

  const isMultiHopTrade = isMultiHopTradeQuote(quote)

  const lastHop = (isMultiHopTrade ? secondHop : firstHop)!
  const walletConnectedChainIds = selectWalletConnectedChainIds(state)
  const sellAmountCryptoPrecision = selectInputSellAmountCryptoPrecision(state)
  const sellAmountCryptoBaseUnit = firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit
  const buyAmountCryptoBaseUnit = lastHop.buyAmountBeforeFeesCryptoBaseUnit

  // the network fee asset for the first hop in the trade
  const firstHopSellFeeAsset = selectFeeAssetById(state, firstHop.sellAsset.assetId)

  // the network fee asset for the second hop in the trade
  const secondHopSellFeeAsset =
    isMultiHopTrade && secondHop
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

  // Technically does for cow swap too, but we deduct it off the sell amount in that case
  const networkFeeRequiresBalance = swapperName !== SwapperName.CowSwap

  const firstHopNetworkFeeCryptoPrecision =
    networkFeeRequiresBalance && firstHopSellFeeAsset
      ? fromBaseUnit(
          bnOrZero(firstHop.feeData.networkFeeCryptoBaseUnit),
          firstHopSellFeeAsset.precision,
        )
      : bn(0).toFixed()

  const secondHopNetworkFeeCryptoPrecision =
    networkFeeRequiresBalance && secondHopSellFeeAsset && secondHop
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
    !isMultiHopTrade || walletConnectedChainIds.includes(firstHop.buyAsset.chainId)

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
  const insufficientBalanceForProtocolFeesErrors =
    // TODO(gomes): We will need to handle this differently since a rate doesn't contain bip44 data
    sellAssetAccountNumber !== undefined
      ? Object.entries(totalProtocolFeesByAsset)
          .filter(([assetId, protocolFee]: [AssetId, ProtocolFee]) => {
            if (!protocolFee.requiresBalance) return false

            const accountId =
              portfolioAccountIdByNumberByChainId[sellAssetAccountNumber][protocolFee.asset.chainId]
            const balanceCryptoBaseUnit = portfolioAccountBalancesBaseUnit[accountId][assetId]

            if (
              firstHopSellFeeAsset?.assetId === assetId &&
              firstHop.sellAsset.assetId === assetId
            ) {
              return bnOrZero(balanceCryptoBaseUnit)
                .minus(sellAmountCryptoBaseUnit)
                .minus(protocolFee.amountCryptoBaseUnit)
                .lt(0)
            }

            return bnOrZero(balanceCryptoBaseUnit).lt(protocolFee.amountCryptoBaseUnit)
          })
          .map(([_assetId, protocolFee]: [AssetId, ProtocolFee]) => {
            return {
              error: TradeQuoteValidationError.InsufficientFundsForProtocolFee,
              meta: {
                symbol: protocolFee.asset.symbol,
                chainName: assertGetChainAdapter(protocolFee.asset.chainId).getDisplayName(),
              },
            }
          })
      : []

  const recommendedMinimumCryptoBaseUnit = (quote as ThorTradeQuote)
    .recommendedMinimumCryptoBaseUnit
  const isUnsafeQuote =
    sellAmountCryptoBaseUnit &&
    !(
      !recommendedMinimumCryptoBaseUnit ||
      bnOrZero(sellAmountCryptoBaseUnit).gte(recommendedMinimumCryptoBaseUnit)
    )

  // Ensure the trade is not selling an amount higher than the user input, within a very safe threshold.
  // Threshold is required because cowswap sometimes quotes a sell amount a teeny-tiny bit more than you input.
  const invalidQuoteSellAmount = bn(inputSellAmountCryptoBaseUnit).lt(
    firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

  return {
    errors: [
      !isTradingActiveOnSellPool && {
        error: TradeQuoteValidationError.TradingInactiveOnSellChain,
        meta: {
          chainName: assertGetChainAdapter(
            firstHop.sellAsset.chainId as KnownChainIds,
          ).getDisplayName(),
        },
      },
      !isTradingActiveOnBuyPool && {
        error: TradeQuoteValidationError.TradingInactiveOnBuyChain,
        meta: {
          chainName: assertGetChainAdapter(
            firstHop.buyAsset.chainId as KnownChainIds,
          ).getDisplayName(),
        },
      },
      walletId &&
        !walletSupportsIntermediaryAssetChain &&
        secondHop && {
          error: TradeQuoteValidationError.IntermediaryAssetNotNotSupportedByWallet,
          meta: {
            assetSymbol: secondHop.sellAsset.symbol,
            chainSymbol: getChainShortName(secondHop.sellAsset.chainId as KnownChainIds),
          },
        },
      walletId &&
        !firstHopHasSufficientBalanceForGas && {
          error: TradeQuoteValidationError.InsufficientFirstHopFeeAssetBalance,
          meta: {
            assetSymbol: firstHopSellFeeAsset?.symbol,
            chainSymbol: firstHopSellFeeAsset
              ? getChainShortName(firstHopSellFeeAsset.chainId as KnownChainIds)
              : '',
          },
        },
      walletId &&
        !secondHopHasSufficientBalanceForGas && {
          error: TradeQuoteValidationError.InsufficientSecondHopFeeAssetBalance,
          meta: {
            assetSymbol: secondHopSellFeeAsset?.symbol,
            chainSymbol: secondHopSellFeeAsset
              ? getChainShortName(secondHopSellFeeAsset.chainId as KnownChainIds)
              : '',
          },
        },
      feesExceedsSellAmount && { error: TradeQuoteValidationError.SellAmountBelowTradeFee },
      invalidQuoteSellAmount && { error: TradeQuoteValidationError.QuoteSellAmountInvalid },

      ...insufficientBalanceForProtocolFeesErrors,
    ].filter(isTruthy),
    warnings: [isUnsafeQuote && { error: TradeQuoteWarning.UnsafeQuote }].filter(isTruthy),
  }
}
