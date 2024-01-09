import { fromAccountId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { KnownChainIds } from '@shapeshiftoss/types'
import { useMemo } from 'react'
import { getChainShortName } from 'components/MultiHopTrade/components/MultiHopTradeConfirm/utils/getChainShortName'
import { useInsufficientBalanceProtocolFeeMeta } from 'components/MultiHopTrade/hooks/quoteValidation/useInsufficientBalanceProtocolFeeMeta'
import type { QuoteStatus } from 'components/MultiHopTrade/types'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ErrorWithMeta } from 'state/apis/swappers'
import { TradeQuoteError, TradeQuoteRequestError } from 'state/apis/swappers'
import {
  selectSwappersApiTradeQuotePending,
  selectTradeQuoteRequestErrors,
} from 'state/apis/swappers/selectors'
import {
  selectBuyAsset,
  selectSellAmountCryptoPrecision,
} from 'state/slices/swappersSlice/selectors'
import {
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectFirstHopSellAsset,
  selectFirstHopSellFeeAsset,
  selectSecondHopSellAsset,
  selectSecondHopSellFeeAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'

import { useAccountIds } from '../useAccountIds'

export const useActiveQuoteStatus = (): QuoteStatus => {
  const firstHopSellAsset = useAppSelector(selectFirstHopSellAsset)
  const secondHopSellAsset = useAppSelector(selectSecondHopSellAsset)
  const firstHopSellFeeAsset = useAppSelector(selectFirstHopSellFeeAsset)
  const secondHopSellFeeAsset = useAppSelector(selectSecondHopSellFeeAsset)
  const tradeBuyAsset = useAppSelector(selectBuyAsset)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)
  const tradeQuoteRequestErrors = useAppSelector(selectTradeQuoteRequestErrors)
  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const insufficientBalanceProtocolFeeMeta = useInsufficientBalanceProtocolFeeMeta()

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

  const isLoading = useAppSelector(selectSwappersApiTradeQuotePending)

  const quoteErrors: ErrorWithMeta<TradeQuoteError | TradeQuoteRequestError>[] = useMemo(() => {
    if (isLoading || !hasUserEnteredAmount) return []

    return tradeQuoteRequestErrors ?? activeQuoteErrors ?? []
  }, [activeQuoteErrors, hasUserEnteredAmount, isLoading, tradeQuoteRequestErrors])

  // Map validation errors to translation strings
  const quoteStatusTranslation: QuoteStatus['quoteStatusTranslation'] = useMemo(() => {
    // Show the first error in the button
    const firstError = quoteErrors?.[0]

    // TODO(gomes): Shoehorning this here for an immediate fix, but errors should be handled at quote level like all others
    if (disableSmartContractSwap) return 'trade.errors.smartContractWalletNotSupported'

    // Return a translation string based on the first error. We might want to show multiple one day.
    return (() => {
      switch (firstError.error) {
        case TradeQuoteRequestError.NoConnectedWallet:
          return 'common.connectWallet'
        case TradeQuoteRequestError.BuyAssetNotNotSupportedByWallet:
          return ['trade.errors.noReceiveAddress', { assetSymbol: tradeBuyAsset?.symbol }]
        case TradeQuoteRequestError.InsufficientSellAssetBalance:
          return 'common.insufficientFunds'
        case TradeQuoteError.InsufficientFirstHopFeeAssetBalance:
          return [
            'common.insufficientAmountForGas',
            {
              assetSymbol: firstHopSellFeeAsset?.symbol,
              chainSymbol: firstHopSellFeeAsset
                ? getChainShortName(firstHopSellFeeAsset.chainId as KnownChainIds)
                : '',
            },
          ]
        case TradeQuoteError.InsufficientSecondHopFeeAssetBalance:
          return [
            'common.insufficientAmountForGas',
            {
              assetSymbol: secondHopSellFeeAsset?.symbol,
              chainSymbol: secondHopSellFeeAsset
                ? getChainShortName(secondHopSellFeeAsset.chainId as KnownChainIds)
                : '',
            },
          ]
        case TradeQuoteError.NoQuotesAvailableForTradePair:
          return 'trade.errors.invalidTradePairBtnText'
        case TradeQuoteError.UnknownError:
          return 'trade.errors.quoteError'
        case TradeQuoteRequestError.NoQuotesAvailable:
          return 'trade.errors.noQuotesAvailable'
        case TradeQuoteRequestError.SellAssetNotNotSupportedByWallet:
          return firstHopSellAsset
            ? [
                'trade.errors.assetNotSupportedByWallet',
                {
                  assetSymbol: firstHopSellAsset.symbol,
                  chainSymbol: getChainShortName(firstHopSellAsset.chainId as KnownChainIds),
                },
              ]
            : 'sellAssetNotSupportedByWallet'
        case TradeQuoteError.IntermediaryAssetNotNotSupportedByWallet:
          return secondHopSellAsset
            ? [
                'trade.errors.assetNotSupportedByWallet',
                {
                  assetSymbol: secondHopSellAsset.symbol,
                  chainSymbol: getChainShortName(secondHopSellAsset.chainId as KnownChainIds),
                },
              ]
            : 'intermediaryAssetNotSupportedByWallet'
        case TradeQuoteRequestError.NoReceiveAddress:
        case TradeQuoteError.SellAmountBelowTradeFee:
          return 'trade.errors.sellAmountDoesNotCoverFee'
        case TradeQuoteError.InsufficientFundsForProtocolFee:
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
  }
}
