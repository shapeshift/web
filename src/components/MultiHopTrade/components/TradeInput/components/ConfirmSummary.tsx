import { Alert, AlertIcon, useMediaQuery } from '@chakra-ui/react'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { SwapperName, TradeQuoteError } from '@shapeshiftoss/swapper'
import { isToken, isUtxoChainId } from '@shapeshiftoss/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { PriceImpact } from '../../PriceImpact'
import { SharedTradeInputFooter } from '../../SharedTradeInput/SharedTradeInputFooter/SharedTradeInputFooter'
import { getQuoteErrorTranslation } from '../getQuoteErrorTranslation'
import { getQuoteRequestErrorTranslation } from '../getQuoteRequestErrorTranslation'
import { useTradeReceiveAddress } from '../hooks/useTradeReceiveAddress'
import { MaxSlippage } from './MaxSlippage'
import { Protocol } from './Protocol'
import { ReceiveAddress } from './ReceiveAddress'

import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { parseAmountDisplayMeta } from '@/components/MultiHopTrade/helpers'
import { usePriceImpact } from '@/components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { useAccountIds } from '@/components/MultiHopTrade/hooks/useAccountIds'
import { useIsManualReceiveAddressRequired } from '@/components/MultiHopTrade/hooks/useIsManualReceiveAddressRequired'
import { TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { useIsSmartContractAddress } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { selectIsTradeQuoteApiQueryPending } from '@/state/apis/swapper/selectors'
import { selectFeeAssetById } from '@/state/slices/selectors'
import {
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAmountUsd,
  selectInputSellAsset,
  selectIsManualReceiveAddressEditing,
  selectIsManualReceiveAddressValid,
  selectIsManualReceiveAddressValidating,
} from '@/state/slices/tradeInputSlice/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteAffiliateBps,
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectFirstHop,
  selectIsAnySwapperQuoteAvailable,
  selectIsAnyTradeQuoteLoading,
  selectShouldShowTradeQuoteOrAwaitInput,
  selectTotalNetworkFeeUserCurrency,
  selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  selectTradeQuoteRequestErrors,
  selectTradeQuoteResponseErrors,
  selectTradeSlippagePercentageDecimal,
} from '@/state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from '@/state/store'
import { breakpoints } from '@/theme/theme'

type ConfirmSummaryProps = {
  isCompact: boolean | undefined
  isLoading: boolean
  receiveAddress: string | undefined
}

export const ConfirmSummary = ({
  isCompact,
  isLoading: isParentLoading,
  receiveAddress,
}: ConfirmSummaryProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const {
    state: { isConnected },
  } = useWallet()

  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrency)
  const isManualReceiveAddressValidating = useAppSelector(selectIsManualReceiveAddressValidating)
  const isManualReceiveAddressEditing = useAppSelector(selectIsManualReceiveAddressEditing)
  const isManualReceiveAddressValid = useAppSelector(selectIsManualReceiveAddressValid)
  const slippagePercentageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const activeQuoteErrors = useAppSelector(selectActiveQuoteErrors)
  const quoteRequestErrors = useAppSelector(selectTradeQuoteRequestErrors)
  const quoteResponseErrors = useAppSelector(selectTradeQuoteResponseErrors)
  const shouldShowTradeQuoteOrAwaitInput = useAppSelector(selectShouldShowTradeQuoteOrAwaitInput)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
  const isAnyTradeQuoteLoading = useAppSelector(selectIsAnyTradeQuoteLoading)
  const isAnySwapperQuoteAvailable = useAppSelector(selectIsAnySwapperQuoteAvailable)
  const hasUserEnteredAmount = useAppSelector(selectHasUserEnteredAmount)
  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const activeQuote = useAppSelector(selectActiveQuote)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )
  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const inputAmountUsd = useAppSelector(selectInputSellAmountUsd)
  const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)
  const affiliateFeeAfterDiscountUserCurrency = useAppSelector(
    selectTradeQuoteAffiliateFeeAfterDiscountUserCurrency,
  )

  const { priceImpactColor, priceImpactPercentage } = usePriceImpact(activeQuote)

  const { data: _isSmartContractReceiveAddress, isLoading: isReceiveAddressByteCodeLoading } =
    useIsSmartContractAddress(receiveAddress ?? '', buyAsset.chainId)
  const { sellAssetAccountId, buyAssetAccountId } = useAccountIds()

  const isTaprootReceiveAddress = useMemo(
    () => isUtxoChainId(buyAsset.chainId) && receiveAddress?.startsWith('bc1p'),
    [buyAsset.chainId, receiveAddress],
  )

  const shouldDisableThorTaprootReceiveAddress = useMemo(() => {
    // Taproot addresses are not supported by THORChain or MAYAChain swappers currently
    if (
      (activeSwapperName === SwapperName.Thorchain ||
        activeSwapperName === SwapperName.Mayachain) &&
      isTaprootReceiveAddress
    )
      return true

    return false
  }, [activeSwapperName, isTaprootReceiveAddress])

  const shouldDisableThorNativeSmartContractReceive = useMemo(() => {
    // THORChain and MAYAChain is only affected by the sc limitation for native EVM receives
    // https://dev.thorchain.org/protocol-development/chain-clients/evm-chains.html#admonition-warning
    if (
      (activeSwapperName === SwapperName.Thorchain ||
        activeSwapperName === SwapperName.Mayachain) &&
      _isSmartContractReceiveAddress &&
      isEvmChainId(buyAsset.chainId) &&
      buyAsset.assetId === buyAssetFeeAsset?.assetId
    )
      return true

    return false
  }, [
    activeSwapperName,
    buyAssetFeeAsset,
    _isSmartContractReceiveAddress,
    buyAsset.chainId,
    buyAsset.assetId,
  ])

  const quoteHasError = useMemo(() => {
    const tradeQuoteError = activeQuoteErrors?.[0]

    // Ensures final trade quote errors are not displayed at input time for one or two render cycles as tradeQuoteSlice when reset
    // if backing out from an errored final quote back to input

    if (tradeQuoteError && tradeQuoteError.error === TradeQuoteError.FinalQuoteMaxSlippageExceeded)
      return false
    if (tradeQuoteError && tradeQuoteError.error === TradeQuoteError.FinalQuoteMaxSlippageExceeded)
      return false
    if (!shouldShowTradeQuoteOrAwaitInput) return false
    if (hasUserEnteredAmount && !isAnyTradeQuoteLoading && !isAnySwapperQuoteAvailable) return true
    return !!activeQuoteErrors?.length || !!quoteRequestErrors?.length
  }, [
    activeQuoteErrors,
    shouldShowTradeQuoteOrAwaitInput,
    hasUserEnteredAmount,
    isAnyTradeQuoteLoading,
    isAnySwapperQuoteAvailable,
    quoteRequestErrors?.length,
  ])

  const {
    manualReceiveAddress,
    walletReceiveAddress,
    isLoading: isWalletReceiveAddressLoading,
  } = useTradeReceiveAddress()

  const isManualReceiveAddressRequired = useIsManualReceiveAddressRequired({
    shouldForceManualAddressEntry: false,
    sellAccountId: sellAssetAccountId,
    buyAsset,
    manualReceiveAddress,
    walletReceiveAddress,
    isWalletReceiveAddressLoading,
  })

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      // don't execute trades while address is validating
      isManualReceiveAddressRequired ||
      isManualReceiveAddressValidating ||
      isManualReceiveAddressEditing ||
      isManualReceiveAddressValid === false ||
      // don't execute trades for smart contract receive addresses for THOR native assets receives
      shouldDisableThorNativeSmartContractReceive ||
      // Taproot not supported by THORChain swapper currently
      shouldDisableThorTaprootReceiveAddress ||
      // don't allow non-existent quotes to be executed
      !activeQuote ||
      !hasUserEnteredAmount ||
      // don't allow users to proceed until a swapper has been selected
      !activeSwapperName ||
      // don't allow users to execute trades while the quote is being updated
      isTradeQuoteApiQueryPending[activeSwapperName]
    )
  }, [
    isManualReceiveAddressRequired,
    isManualReceiveAddressValidating,
    isManualReceiveAddressEditing,
    isManualReceiveAddressValid,
    shouldDisableThorNativeSmartContractReceive,
    shouldDisableThorTaprootReceiveAddress,
    activeQuote,
    hasUserEnteredAmount,
    activeSwapperName,
    isTradeQuoteApiQueryPending,
  ])

  const quoteStatusTranslation = useMemo(() => {
    const quoteRequestError = quoteRequestErrors[0]
    const quoteResponseError = quoteResponseErrors[0]
    const tradeQuoteError = activeQuoteErrors?.[0]
    switch (true) {
      case isDiscoveringAccounts && !(sellAssetAccountId || buyAssetAccountId):
        return 'common.accountsLoading'
      case !shouldShowTradeQuoteOrAwaitInput:
      case !hasUserEnteredAmount:
        return 'trade.previewTrade'
      case !!quoteRequestError:
        return getQuoteRequestErrorTranslation(quoteRequestError)
      case !!quoteResponseError:
        return getQuoteRequestErrorTranslation(quoteResponseError)
      // Ensures final trade quote errors are not displayed at input time for one or two render cycles as tradeQuoteSlice when reset
      // if backing out from an errored final quote back to input
      case tradeQuoteError &&
        (tradeQuoteError.error === TradeQuoteError.FinalQuoteMaxSlippageExceeded ||
          tradeQuoteError.error === TradeQuoteError.FinalQuoteExecutionReverted):
        return 'trade.previewTrade'
      case !!tradeQuoteError:
        // TS pls
        return tradeQuoteError ? getQuoteErrorTranslation(tradeQuoteError) : 'common.error'
      case !isAnyTradeQuoteLoading && !isAnySwapperQuoteAvailable:
        return 'trade.noRateAvailable'
      case !isConnected:
        // We got a happy path quote, but no wallet connected
        return 'common.connectWallet'
      default:
        return 'trade.previewTrade'
    }
  }, [
    quoteRequestErrors,
    quoteResponseErrors,
    activeQuoteErrors,
    isDiscoveringAccounts,
    sellAssetAccountId,
    buyAssetAccountId,
    shouldShowTradeQuoteOrAwaitInput,
    hasUserEnteredAmount,
    isAnyTradeQuoteLoading,
    isAnySwapperQuoteAvailable,
    isConnected,
  ])

  const handleOpenCompactQuoteList = useCallback(() => {
    if (!isCompact && !isSmallerThanXl) return
    navigate(`/trade/${TradeRoutePaths.QuoteList}`)
  }, [navigate, isCompact, isSmallerThanXl])

  const nativeAssetBridgeWarning: string | [string, InterpolationOptions] | undefined =
    useMemo(() => {
      if (!(sellAsset && buyAsset && buyAssetFeeAsset)) return

      const isTokenBridge = isToken(buyAsset.assetId) && sellAsset.chainId !== buyAsset.chainId

      if (isTokenBridge)
        return [
          'bridge.nativeAssetWarning',
          {
            destinationSymbol: buyAssetFeeAsset.symbol,
            destinationChainName: buyAssetFeeAsset.networkName,
          },
        ]
    }, [buyAsset, buyAssetFeeAsset, sellAsset])

  const maybeWarning = useMemo(() => {
    if (nativeAssetBridgeWarning)
      return (
        <Alert status='info' borderRadius='lg'>
          <AlertIcon />
          <Text translation={nativeAssetBridgeWarning} />
        </Alert>
      )

    return null
  }, [nativeAssetBridgeWarning])

  const manualAddressEntryDescription = useMemo(() => {
    if (shouldDisableThorNativeSmartContractReceive)
      return translate('trade.shouldDisableThorNativeSmartContractReceive', {
        chainName: buyAssetFeeAsset?.networkName,
        nativeAssetSymbol: buyAssetFeeAsset?.symbol,
      })
    return undefined
  }, [
    buyAssetFeeAsset?.networkName,
    buyAssetFeeAsset?.symbol,
    shouldDisableThorNativeSmartContractReceive,
    translate,
  ])

  const isLoading = useMemo(() => {
    return isParentLoading || isReceiveAddressByteCodeLoading
  }, [isReceiveAddressByteCodeLoading, isParentLoading])

  const receiveSummaryDetails = useMemo(() => {
    const intermediaryTransactionOutputs = tradeQuoteStep?.intermediaryTransactionOutputs

    const intermediaryTransactionOutputsParsed = intermediaryTransactionOutputs
      ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
      : undefined

    const hasIntermediaryTransactionOutputs =
      intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0

    return (
      <>
        <MaxSlippage
          swapSource={tradeQuoteStep?.source}
          isLoading={isLoading}
          symbol={buyAsset.symbol}
          amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
          slippagePercentageDecimal={slippagePercentageDecimal}
          hasIntermediaryTransactionOutputs={hasIntermediaryTransactionOutputs}
          intermediaryTransactionOutputs={intermediaryTransactionOutputs}
        />

        <PriceImpact priceImpactPercentage={priceImpactPercentage} color={priceImpactColor} />
      </>
    )
  }, [
    buyAmountAfterFeesCryptoPrecision,
    buyAsset.symbol,
    isLoading,
    priceImpactPercentage,
    slippagePercentageDecimal,
    tradeQuoteStep?.intermediaryTransactionOutputs,
    tradeQuoteStep?.source,
    priceImpactColor,
  ])

  const swapperIcon = useMemo(() => {
    return <SwapperIcons swapperName={activeSwapperName} swapSource={tradeQuoteStep?.source} />
  }, [activeSwapperName, tradeQuoteStep?.source])

  return (
    <SharedTradeInputFooter
      affiliateBps={affiliateBps}
      affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
      buyAsset={buyAsset}
      hasUserEnteredAmount={hasUserEnteredAmount}
      inputAmountUsd={inputAmountUsd}
      isError={quoteHasError}
      isLoading={isLoading}
      quoteStatusTranslation={quoteStatusTranslation}
      rate={activeQuote?.rate}
      receiveSummaryDetails={receiveSummaryDetails}
      sellAccountId={sellAssetAccountId}
      sellAsset={sellAsset}
      shouldDisablePreviewButton={shouldDisablePreviewButton}
      swapperName={activeSwapperName}
      swapSource={tradeQuoteStep?.source}
      networkFeeFiatUserCurrency={totalNetworkFeeFiatPrecision}
    >
      <>
        {maybeWarning}
        {(isCompact || isSmallerThanXl) && tradeQuoteStep?.source && (
          <Protocol
            onClick={handleOpenCompactQuoteList}
            title={tradeQuoteStep.source}
            icon={swapperIcon}
          />
        )}
        <ReceiveAddress
          shouldForceManualAddressEntry={shouldDisableThorNativeSmartContractReceive}
          receiveAddressDescription={
            shouldDisableThorTaprootReceiveAddress
              ? translate('trade.disableThorTaprootReceive')
              : undefined
          }
          manualAddressEntryDescription={manualAddressEntryDescription}
        />
      </>
    </SharedTradeInputFooter>
  )
}
