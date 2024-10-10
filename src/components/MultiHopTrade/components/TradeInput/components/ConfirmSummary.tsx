import { Alert, AlertIcon, CardFooter, useMediaQuery } from '@chakra-ui/react'
import { isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { SwapperName } from '@shapeshiftoss/swapper'
import { isUtxoChainId } from '@shapeshiftoss/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { useAccountIds } from 'components/MultiHopTrade/hooks/useAccountIds'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { isToken } from 'lib/utils'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import {
  selectFeeAssetById,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAsset,
  selectIsAccountsMetadataLoading,
  selectManualReceiveAddressIsEditing,
  selectManualReceiveAddressIsValid,
  selectManualReceiveAddressIsValidating,
} from 'state/slices/selectors'
import {
  selectActiveQuote,
  selectActiveQuoteErrors,
  selectActiveSwapperName,
  selectBuyAmountAfterFeesCryptoPrecision,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHop,
  selectIsAnySwapperQuoteAvailable,
  selectIsAnyTradeQuoteLoading,
  selectShouldShowTradeQuoteOrAwaitInput,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
  selectTradeQuoteRequestErrors,
  selectTradeQuoteResponseErrors,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { RateGasRow } from '../../RateGasRow'
import { getQuoteErrorTranslation } from '../getQuoteErrorTranslation'
import { getQuoteRequestErrorTranslation } from '../getQuoteRequestErrorTranslation'
import { ManualAddressEntry } from './ManualAddressEntry'
import { ReceiveSummary } from './ReceiveSummary'
import { RecipientAddress } from './RecipientAddress'
import { WithLazyMount } from './WithLazyMount'

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
  const history = useHistory()
  const translate = useTranslate()
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const {
    state: { isConnected, isDemoWallet, wallet },
  } = useWallet()

  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectBuyAmountAfterFeesCryptoPrecision)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const manualReceiveAddressIsValidating = useAppSelector(selectManualReceiveAddressIsValidating)
  const manualReceiveAddressIsEditing = useAppSelector(selectManualReceiveAddressIsEditing)
  const manualReceiveAddressIsValid = useAppSelector(selectManualReceiveAddressIsValid)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
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
  const buyAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectBuyAmountBeforeFeesCryptoPrecision,
  )
  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )
  const isAccountsMetadataLoading = useAppSelector(selectIsAccountsMetadataLoading)

  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)

  const { data: _isSmartContractReceiveAddress, isLoading: isReceiveAddressByteCodeLoading } =
    useIsSmartContractAddress(receiveAddress ?? '', buyAsset.chainId)

  const { sellAssetAccountId: initialSellAssetAccountId } = useAccountIds()

  const isTaprootReceiveAddress = useMemo(
    () => isUtxoChainId(buyAsset.chainId) && receiveAddress?.startsWith('bc1p'),
    [buyAsset.chainId, receiveAddress],
  )

  const disableThorTaprootReceiveAddress = useMemo(() => {
    // Taproot addresses are not supported by THORChain swapper currently
    if (activeSwapperName === SwapperName.Thorchain && isTaprootReceiveAddress) return true

    return false
  }, [activeSwapperName, isTaprootReceiveAddress])

  const disableThorNativeSmartContractReceive = useMemo(() => {
    // THORChain is only affected by the sc limitation for native EVM receives
    // https://dev.thorchain.org/protocol-development/chain-clients/evm-chains.html#admonition-warning
    if (
      activeSwapperName === SwapperName.Thorchain &&
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

  const displayManualAddressEntry = useMemo(() => {
    if (isAccountsMetadataLoading && !initialSellAssetAccountId) return false
    if (!walletSupportsBuyAssetChain) return true
    if (disableThorNativeSmartContractReceive) return true

    return false
  }, [
    isAccountsMetadataLoading,
    initialSellAssetAccountId,
    walletSupportsBuyAssetChain,
    disableThorNativeSmartContractReceive,
  ])

  const quoteHasError = useMemo(() => {
    if (!shouldShowTradeQuoteOrAwaitInput) return false
    if (hasUserEnteredAmount && !isAnyTradeQuoteLoading && !isAnySwapperQuoteAvailable) return true
    return !!activeQuoteErrors?.length || !!quoteRequestErrors?.length
  }, [
    activeQuoteErrors?.length,
    hasUserEnteredAmount,
    isAnySwapperQuoteAvailable,
    shouldShowTradeQuoteOrAwaitInput,
    isAnyTradeQuoteLoading,
    quoteRequestErrors?.length,
  ])

  const isLoading = useMemo(() => {
    return isParentLoading || isReceiveAddressByteCodeLoading || !buyAssetFeeAsset
  }, [buyAssetFeeAsset, isParentLoading, isReceiveAddressByteCodeLoading])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      (isAccountsMetadataLoading && !initialSellAssetAccountId) ||
      // don't allow executing a quote with errors
      quoteHasError ||
      // don't execute trades while address is validating
      manualReceiveAddressIsValidating ||
      manualReceiveAddressIsEditing ||
      manualReceiveAddressIsValid === false ||
      // don't execute trades while in loading state
      isLoading ||
      // don't execute trades for smart contract receive addresses for THOR native assets receives
      disableThorNativeSmartContractReceive ||
      // Taproot not supported by THORChain swapper currently
      disableThorTaprootReceiveAddress ||
      // don't allow non-existent quotes to be executed
      !activeQuote ||
      !hasUserEnteredAmount ||
      // don't allow users to proceed until a swapper has been selected
      !activeSwapperName ||
      // don't allow users to execute trades while the quote is being updated
      isTradeQuoteApiQueryPending[activeSwapperName]
    )
  }, [
    isAccountsMetadataLoading,
    initialSellAssetAccountId,
    quoteHasError,
    manualReceiveAddressIsValidating,
    manualReceiveAddressIsEditing,
    manualReceiveAddressIsValid,
    isLoading,
    disableThorNativeSmartContractReceive,
    disableThorTaprootReceiveAddress,
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
      case isAccountsMetadataLoading && !initialSellAssetAccountId:
        return 'common.accountsLoading'
      case !shouldShowTradeQuoteOrAwaitInput:
      case !hasUserEnteredAmount:
        return 'trade.previewTrade'
      case !!quoteRequestError:
        return getQuoteRequestErrorTranslation(quoteRequestError)
      case !!quoteResponseError:
        return getQuoteRequestErrorTranslation(quoteResponseError)
      case !!tradeQuoteError:
        return getQuoteErrorTranslation(tradeQuoteError!)
      case !isAnyTradeQuoteLoading && !isAnySwapperQuoteAvailable:
        return 'trade.noRateAvailable'
      case !isConnected || isDemoWallet:
        // We got a happy path quote, but we may still be in the context of the demo wallet
        return 'common.connectWallet'
      default:
        return 'trade.previewTrade'
    }
  }, [
    quoteRequestErrors,
    quoteResponseErrors,
    activeQuoteErrors,
    isAccountsMetadataLoading,
    initialSellAssetAccountId,
    shouldShowTradeQuoteOrAwaitInput,
    hasUserEnteredAmount,
    isAnyTradeQuoteLoading,
    isAnySwapperQuoteAvailable,
    isConnected,
    isDemoWallet,
  ])

  const handleOpenCompactQuoteList = useCallback(() => {
    if (!isCompact && !isSmallerThanXl) return
    history.push({ pathname: TradeRoutePaths.QuoteList })
  }, [history, isCompact, isSmallerThanXl])

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

  const manualAddressEntryDescription = useMemo(() => {
    if (disableThorNativeSmartContractReceive)
      return translate('trade.disableThorNativeSmartContractReceive', {
        chainName: buyAssetFeeAsset?.networkName,
        nativeAssetSymbol: buyAssetFeeAsset?.symbol,
      })
    return undefined
  }, [
    buyAssetFeeAsset?.networkName,
    buyAssetFeeAsset?.symbol,
    disableThorNativeSmartContractReceive,
    translate,
  ])

  const buttonText = useMemo(() => {
    return <Text translation={quoteStatusTranslation} />
  }, [quoteStatusTranslation])

  return (
    <>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={0}
        py={0}
      >
        {hasUserEnteredAmount && (
          <RateGasRow
            sellSymbol={sellAsset.symbol}
            buySymbol={buyAsset.symbol}
            gasFee={totalNetworkFeeFiatPrecision ?? 'unknown'}
            rate={activeQuote?.rate}
            isLoading={isLoading}
            swapperName={activeSwapperName}
            swapSource={tradeQuoteStep?.source}
            onRateClick={handleOpenCompactQuoteList}
            allowSelectQuote={Boolean(isSmallerThanXl || isCompact)}
          >
            <ReceiveSummary
              isLoading={isLoading}
              symbol={buyAsset.symbol}
              amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
              amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision}
              protocolFees={totalProtocolFees}
              slippageDecimalPercentage={slippageDecimal}
              swapperName={activeSwapperName ?? ''}
              defaultIsOpen={true}
              swapSource={tradeQuoteStep?.source}
              priceImpact={priceImpactPercentage}
            />
          </RateGasRow>
        )}
      </CardFooter>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        {nativeAssetBridgeWarning && (
          <Alert status='info' borderRadius='lg'>
            <AlertIcon />
            <Text translation={nativeAssetBridgeWarning} />
          </Alert>
        )}
        <WithLazyMount
          shouldUse={Boolean(receiveAddress) && disableThorNativeSmartContractReceive === false}
          shouldForceManualAddressEntry={disableThorNativeSmartContractReceive}
          component={RecipientAddress}
          description={
            disableThorTaprootReceiveAddress
              ? translate('trade.disableThorTaprootReceive')
              : undefined
          }
        />
        <WithLazyMount
          shouldUse={displayManualAddressEntry}
          shouldForceManualAddressEntry={disableThorNativeSmartContractReceive}
          component={ManualAddressEntry}
          description={manualAddressEntryDescription}
          chainId={buyAsset.chainId}
        />

        <ButtonWalletPredicate
          isLoading={isAccountsMetadataLoading && !initialSellAssetAccountId}
          loadingText={buttonText}
          type='submit'
          colorScheme={quoteHasError ? 'red' : 'blue'}
          size='lg-multiline'
          data-test='trade-form-preview-button'
          isDisabled={shouldDisablePreviewButton}
          isValidWallet={true}
          mx={-2}
        >
          {buttonText}
        </ButtonWalletPredicate>
      </CardFooter>
    </>
  )
}
