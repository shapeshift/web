import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, SwapErrorRight, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName, TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
// import { isTradingActive } from 'components/MultiHopTrade/utils'
import { isSmartContractAddress } from 'lib/address/utils'
import { baseUnitToHuman, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { ThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { assertGetChainAdapter, assertUnreachable, isTruthy } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectWalletSupportedChainIds,
} from 'state/slices/common-selectors'
import {
  selectAssets,
  selectFeeAssetById,
  selectFirstHopSellAccountId,
  selectPortfolioAccountIdByNumberByChainId,
  selectSellAmountCryptoPrecision,
} from 'state/slices/selectors'
import { getTotalProtocolFeeByAssetForStep } from 'state/slices/tradeQuoteSlice/helpers'
import { selectSecondHopSellAccountId } from 'state/slices/tradeQuoteSlice/selectors'

import type { ErrorWithMeta } from '../types'
import { type TradeQuoteError, TradeQuoteValidationError, TradeQuoteWarning } from '../types'

export const validateTradeQuote = async (
  state: ReduxState,
  {
    swapperName,
    quote,
    error,
    isTradingActiveOnSellPool,
    isTradingActiveOnBuyPool,
  }: {
    swapperName: SwapperName
    quote: TradeQuote | undefined
    error: SwapErrorRight | undefined
    isTradingActiveOnSellPool: boolean
    isTradingActiveOnBuyPool: boolean
  },
): Promise<{
  errors: ErrorWithMeta<TradeQuoteError>[]
  warnings: ErrorWithMeta<TradeQuoteWarning>[]
}> => {
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

          const minAmountCryptoHuman = baseUnitToHuman({
            value: minAmountCryptoBaseUnit,
            inputExponent: asset.precision,
          })
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

  const isMultiHopTrade = quote.steps.length > 1
  const firstHop = quote.steps[0]
  const secondHop = quote.steps[1]
  const lastHop = isMultiHopTrade ? secondHop : firstHop
  const walletSupportedChainIds = selectWalletSupportedChainIds(state)
  const sellAmountCryptoPrecision = selectSellAmountCryptoPrecision(state)
  const sellAmountCryptoBaseUnit = firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit
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

  const networkFeeRequiresBalance = swapperName !== SwapperName.CowSwap

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
    !isMultiHopTrade || walletSupportedChainIds.includes(firstHop.buyAsset.chainId)

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
        error: TradeQuoteValidationError.InsufficientFundsForProtocolFee,
        meta: {
          symbol: protocolFee.asset.symbol,
          chainName: assertGetChainAdapter(protocolFee.asset.chainId).getDisplayName(),
        },
      }
    })

  const recommendedMinimumCryptoBaseUnit = (quote as ThorTradeQuote)
    .recommendedMinimumCryptoBaseUnit
  const isUnsafeQuote =
    sellAmountCryptoBaseUnit &&
    !(
      !recommendedMinimumCryptoBaseUnit ||
      bnOrZero(sellAmountCryptoBaseUnit).gte(recommendedMinimumCryptoBaseUnit)
    )

  const disableSmartContractSwap = await (async () => {
    // Swappers other than THORChain shouldn't be affected by this limitation
    if (swapperName !== SwapperName.Thorchain) return false

    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    const _isSmartContractAddress = await isSmartContractAddress(quote.receiveAddress)
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  })()

  return {
    errors: [
      !!disableSmartContractSwap && {
        error: TradeQuoteValidationError.SmartContractWalletNotSupported,
      },
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
      !walletSupportsIntermediaryAssetChain && {
        error: TradeQuoteValidationError.IntermediaryAssetNotNotSupportedByWallet,
        meta: {
          assetSymbol: secondHop.sellAsset.symbol,
          chainSymbol: getChainShortName(secondHop.sellAsset.chainId as KnownChainIds),
        },
      },
      !firstHopHasSufficientBalanceForGas && {
        error: TradeQuoteValidationError.InsufficientFirstHopFeeAssetBalance,
        meta: {
          assetSymbol: firstHopSellFeeAsset?.symbol,
          chainSymbol: firstHopSellFeeAsset
            ? getChainShortName(firstHopSellFeeAsset.chainId as KnownChainIds)
            : '',
        },
      },
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

      ...insufficientBalanceForProtocolFeesErrors,
    ].filter(isTruthy),
    warnings: [isUnsafeQuote && { error: TradeQuoteWarning.UnsafeQuote }].filter(isTruthy),
  }
}
