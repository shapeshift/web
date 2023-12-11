import { fromAccountId } from '@shapeshiftoss/caip'
import { SwapErrorType, SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { useInsufficientBalanceProtocolFeeMeta } from 'components/MultiHopTrade/hooks/quoteValidation/useInsufficientBalanceProtocolFeeMeta'
import { useQuoteValidationErrors } from 'components/MultiHopTrade/hooks/quoteValidation/useQuoteValidationErrors'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { ActiveQuoteStatus } from 'components/MultiHopTrade/types'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectBuyAsset,
  selectSellAmountCryptoPrecision,
} from 'state/slices/swappersSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteError,
  selectActiveSwapperName,
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectSecondHopSellAsset,
  selectSecondHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { useAccountIds } from '../useAccountIds'

export const useActiveQuoteStatus = (): QuoteStatus => {
  const validationErrors = useQuoteValidationErrors()

  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const secondHopSellAsset = useAppSelector(selectSecondHopSellAsset)
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const secondHopSellFeeAsset = useAppSelector(selectSecondHopSellFeeAsset)
  const tradeBuyAsset = useAppSelector(selectBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

  const insufficientBalanceProtocolFeeMeta = useInsufficientBalanceProtocolFeeMeta()

  const activeQuote = useAppSelector(selectActiveQuote)
  const activeQuoteError = useAppSelector(selectActiveQuoteError)
  const activeSwapperName = useAppSelector(selectActiveSwapperName)

  const { sellAssetAccountId } = useAccountIds()

  const userAddress = useMemo(() => {
    if (!sellAssetAccountId) return ''

    return fromAccountId(sellAssetAccountId).account
  }, [sellAssetAccountId])

  const { data: _isSmartContractAddress } = useIsSmartContractAddress(userAddress)

  const disableSmartContractSwap = useMemo(() => {
    // Swappers other than THORChain shouldn't be affected by this limitation
    if (activeSwapperName !== SwapperName.Thorchain) return false

    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractAddress !== false) return true

    // All checks passed - this is an EOA address
    return false
  }, [_isSmartContractAddress, activeSwapperName])

  const hasUserEnteredAmount = useMemo(
    () => bnOrZero(sellAmountCryptoPrecision).gt(0),
    [sellAmountCryptoPrecision],
  )

  // TODO: implement properly once we've got api loading state rigged up
  const isLoading = useMemo(
    () => !activeQuote && !activeQuoteError,
    [activeQuote, activeQuoteError],
  )

  const quoteErrors: ActiveQuoteStatus[] = useMemo(() => {
    if (isLoading || !hasUserEnteredAmount) return []

    const errors: ActiveQuoteStatus[] = []

    if (activeQuoteError) {
      // Map known swapper errors to quote status

      const errorData = (() => {
        switch (activeQuoteError.code) {
          case SwapErrorType.UNSUPPORTED_PAIR:
            return ActiveQuoteStatus.NoQuotesAvailableForTradePair
          default:
            // We didn't recognize the error, use a generic error message
            return ActiveQuoteStatus.UnknownError
        }
      })()

      errors.push(errorData)
    } else if (activeQuote) {
      // We have a quote, but something might be wrong
      return validationErrors
    } else {
      // No quote or error data
      errors.push(ActiveQuoteStatus.NoQuotesAvailable)
    }
    return errors
  }, [isLoading, hasUserEnteredAmount, activeQuoteError, activeQuote, validationErrors])

  // Map validation errors to translation stings
  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = quoteErrors[0]

    // TODO(gomes): Shoehorning this here for an immediate fix, but errors should be handled at quote level like all others
    if (disableSmartContractSwap) return 'trade.errors.smartContractWalletNotSupported'

    // Return a translation string based on the first error. We might want to show multiple one day.
    return (() => {
      switch (firstError) {
        case ActiveQuoteStatus.NoConnectedWallet:
          return 'common.connectWallet'
        case ActiveQuoteStatus.BuyAssetNotNotSupportedByWallet:
          return ['trade.errors.noReceiveAddress', { assetSymbol: tradeBuyAsset?.symbol }]
        case ActiveQuoteStatus.InsufficientSellAssetBalance:
          return 'common.insufficientFunds'
        case ActiveQuoteStatus.InsufficientFirstHopFeeAssetBalance:
          return [
            'common.insufficientAmountForGas',
            {
              assetSymbol: firstHopSellFeeAsset?.symbol,
              chainSymbol: firstHopSellFeeAsset
                ? getChainShortName(firstHopSellFeeAsset.chainId as KnownChainIds)
                : '',
            },
          ]
        case ActiveQuoteStatus.InsufficientSecondHopFeeAssetBalance:
          return [
            'common.insufficientAmountForGas',
            {
              assetSymbol: secondHopSellFeeAsset?.symbol,
              chainSymbol: secondHopSellFeeAsset
                ? getChainShortName(secondHopSellFeeAsset.chainId as KnownChainIds)
                : '',
            },
          ]
        case ActiveQuoteStatus.NoQuotesAvailableForTradePair:
          return 'trade.errors.invalidTradePairBtnText'
        case ActiveQuoteStatus.UnknownError:
          return 'trade.errors.quoteError'
        case ActiveQuoteStatus.NoQuotesAvailable:
          return 'trade.errors.noQuotesAvailable'
        case ActiveQuoteStatus.SellAssetNotNotSupportedByWallet:
          return firstHopSellAsset
            ? [
                'trade.errors.assetNotSupportedByWallet',
                {
                  assetSymbol: firstHopSellAsset.symbol,
                  chainSymbol: getChainShortName(firstHopSellAsset.chainId as KnownChainIds),
                },
              ]
            : 'sellAssetNotSupportedByWallet'
        case ActiveQuoteStatus.IntermediaryAssetNotNotSupportedByWallet:
          return secondHopSellAsset
            ? [
                'trade.errors.assetNotSupportedByWallet',
                {
                  assetSymbol: secondHopSellAsset.symbol,
                  chainSymbol: getChainShortName(secondHopSellAsset.chainId as KnownChainIds),
                },
              ]
            : 'intermediaryAssetNotSupportedByWallet'
        case ActiveQuoteStatus.NoReceiveAddress:
        case ActiveQuoteStatus.SellAmountBelowTradeFee:
          return 'trade.errors.sellAmountDoesNotCoverFee'
        case ActiveQuoteStatus.InsufficientFundsForProtocolFee:
          return [
            'trade.errors.insufficientFundsForProtocolFee',
            insufficientBalanceProtocolFeeMeta ?? {},
          ]
        default:
          return 'trade.previewTrade'
      }
    })()
  }, [
    quoteErrors,
    disableSmartContractSwap,
    tradeBuyAsset?.symbol,
    firstHopSellFeeAsset,
    secondHopSellFeeAsset,
    firstHopSellAsset,
    secondHopSellAsset,
    insufficientBalanceProtocolFeeMeta,
  ])

  return {
    quoteErrors,
    quoteStatusTranslation,
    error: activeQuoteError,
  }
}
