import type { AssetId } from '@shapeshiftoss/caip'
import type { ProtocolFee, SwapErrorRight, SwapSource, TradeQuote } from '@shapeshiftoss/swapper'
import { SwapperName, TradeQuoteError as SwapperTradeQuoteError } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { isMultiHopTradeQuote } from 'components/MultiHopTrade/utils'
// import { isTradingActive } from 'components/MultiHopTrade/utils'
import { isSmartContractAddress } from 'lib/address/utils'
import { baseUnitToHuman, bn, bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import type { ThorTradeQuote } from 'lib/swapper/swappers/ThorchainSwapper/getThorTradeQuote/getTradeQuote'
import { assertGetChainAdapter, assertUnreachable, isTruthy } from 'lib/utils'
import type { ReduxState } from 'state/reducer'
import {
  selectPortfolioAccountBalancesBaseUnit,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectWalletSupportedChainIds,
} from 'state/slices/common-selectors'
import {
  selectFeeAssetById,
  selectFirstHopSellAccountId,
  selectFungibleAssets,
  selectInputSellAmountCryptoPrecision,
  selectPortfolioAccountIdByNumberByChainId,
  selectSecondHopSellAccountId,
} from 'state/slices/selectors'
import { getTotalProtocolFeeByAssetForStep } from 'state/slices/tradeQuoteSlice/helpers'

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
    sendAddress,
    inputSellAmountCryptoBaseUnit,
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

          const assetsById = selectFungibleAssets(state)
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

  // This should really never happen but in case it does:
  if (!sendAddress) throw new Error('sendAddress is required')

  const firstHop = quote.steps[0]
  const secondHop = quote.steps[1]

  const isMultiHopTrade = isMultiHopTradeQuote(quote)

  const lastHop = (isMultiHopTrade ? secondHop : firstHop)!
  const walletSupportedChainIds = selectWalletSupportedChainIds(state)
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

  const firstHopAssetBalancePrecision = selectPortfolioCryptoPrecisionBalanceByFilter(state, {
    assetId: firstHop.sellAsset.assetId,
    accountId: firstHopSellAccountId ?? '',
  })
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

  // const networkFeeRequiresBalance = swapperName !== SwapperName.CowSwap
  // Keeping the above commented for historical reference
  // CowSwap fees used to be paid directly at execution-time, but they now need to be included in the order in *addition* to the amount being traded
  const networkFeeRequiresBalance = true
  const firstHopPayableProtocolFeeCryptoPrecision =
    swapperName === SwapperName.CowSwap
      ? fromBaseUnit(
          bnOrZero(firstHop.feeData.protocolFees[firstHop.sellAsset.assetId]?.amountCryptoBaseUnit),
          firstHop.sellAsset.precision,
        )
      : bn(0).toFixed()

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
    !isMultiHopTrade || walletSupportedChainIds.includes(firstHop.buyAsset.chainId)

  const firstHopHasSufficientBalanceForPayableProtocolFees = bnOrZero(firstHopAssetBalancePrecision)
    .minus(sellAmountCryptoPrecision)
    .minus(firstHopPayableProtocolFeeCryptoPrecision ?? 0)
    .gte(0)

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
    const _isSmartContractSellAddress = await isSmartContractAddress(sendAddress)
    const _isSmartContractReceiveAddress = await isSmartContractAddress(quote.receiveAddress)
    // For long-tails, the *destination* address cannot be a smart contract
    // https://dev.thorchain.org/aggregators/aggregator-overview.html#admonition-warning
    // This doesn't apply to regular THOR swaps however, which docs have no mention of *destination* having to be an EOA
    // https://dev.thorchain.org/protocol-development/chain-clients/evm-chains.html?search=smart%20contract
    if (
      [firstHop.source, secondHop?.source ?? ('' as SwapSource)].some(source =>
        [THORCHAIN_LONGTAIL_SWAP_SOURCE, THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE].includes(source),
      ) &&
      _isSmartContractReceiveAddress !== false
    )
      return true
    // Regardless of whether this is a long-tail or not, the *source* address should never be a smart contract
    // https://dev.thorchain.org/concepts/sending-transactions.html?highlight=smart%20congtract%20address#admonition-danger-2
    // https://dev.thorchain.org/protocol-development/chain-clients/evm-chains.html?highlight=smart%20congtract%20address#admonition-warning-1
    if (_isSmartContractSellAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  })()

  // Ensure the trade is not selling an amount higher than the user input, within a very safe threshold.
  // Threshold is required because cowswap sometimes quotes a sell amount a teeny-tiny bit more than you input.
  const invalidQuoteSellAmount = bn(inputSellAmountCryptoBaseUnit).lt(
    firstHop.sellAmountIncludingProtocolFeesCryptoBaseUnit,
  )

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
      !walletSupportsIntermediaryAssetChain &&
        secondHop && {
          error: TradeQuoteValidationError.IntermediaryAssetNotNotSupportedByWallet,
          meta: {
            assetSymbol: secondHop.sellAsset.symbol,
            chainSymbol: getChainShortName(secondHop.sellAsset.chainId as KnownChainIds),
          },
        },
      !firstHopHasSufficientBalanceForPayableProtocolFees && {
        error: TradeQuoteValidationError.InsufficientFirstHopAssetBalance,
        meta: {
          assetSymbol: firstHop.sellAsset.symbol,
          chainSymbol: firstHopSellFeeAsset
            ? getChainShortName(firstHopSellFeeAsset.chainId as KnownChainIds)
            : '',
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
      invalidQuoteSellAmount && { error: TradeQuoteValidationError.QuoteSellAmountInvalid },

      ...insufficientBalanceForProtocolFeesErrors,
    ].filter(isTruthy),
    warnings: [isUnsafeQuote && { error: TradeQuoteWarning.UnsafeQuote }].filter(isTruthy),
  }
}
