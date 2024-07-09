import { Alert, AlertIcon, Button, CardFooter, useMediaQuery } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { ArbitrumBridgeTradeQuote } from '@shapeshiftoss/swapper/dist/swappers/ArbitrumBridgeSwapper/getTradeQuote/getTradeQuote'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_LONGTAIL_SWAP_SOURCE,
} from '@shapeshiftoss/swapper/dist/swappers/ThorchainSwapper/constants'
import type { InterpolationOptions } from 'node-polyglot'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { Text } from 'components/Text'
import { useIsSmartContractAddress } from 'hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectIsTradeQuoteApiQueryPending } from 'state/apis/swapper/selectors'
import {
  selectFeeAssetById,
  selectHasUserEnteredAmount,
  selectInputBuyAsset,
  selectInputSellAsset,
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
  selectIsAnyTradeQuoteLoaded,
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
  initialSellAssetAccountId: AccountId | undefined
  receiveAddress: string | undefined
}

export const ConfirmSummary = ({
  isCompact,
  isLoading: isParentLoading,
  initialSellAssetAccountId,
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
  const isAnyTradeQuoteLoaded = useAppSelector(selectIsAnyTradeQuoteLoaded)
  const isTradeQuoteApiQueryPending = useAppSelector(selectIsTradeQuoteApiQueryPending)
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

  const { priceImpactPercentage } = usePriceImpact(activeQuote)
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)

  const userAddress = useMemo(() => {
    if (!initialSellAssetAccountId) return ''

    return fromAccountId(initialSellAssetAccountId).account
  }, [initialSellAssetAccountId])

  const { data: _isSmartContractSellAddress, isLoading: isSellAddressByteCodeLoading } =
    useIsSmartContractAddress(userAddress)

  const { data: _isSmartContractReceiveAddress, isLoading: isReceiveAddressByteCodeLoading } =
    useIsSmartContractAddress(receiveAddress ?? '')

  const disableSmartContractSwap = useMemo(() => {
    // Swappers other than THORChain shouldn't be affected by this limitation
    if (activeSwapperName !== SwapperName.Thorchain) return false

    // This is either a smart contract address, or the bytecode is still loading - disable confirm
    if (_isSmartContractSellAddress !== false) return true
    if (
      [THORCHAIN_LONGTAIL_SWAP_SOURCE, THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE].includes(
        tradeQuoteStep?.source!,
      ) &&
      _isSmartContractReceiveAddress !== false
    )
      return true

    // All checks passed - this is an EOA address
    return false
  }, [
    _isSmartContractReceiveAddress,
    _isSmartContractSellAddress,
    activeSwapperName,
    tradeQuoteStep?.source,
  ])

  const quoteHasError = useMemo(() => {
    if (!isAnyTradeQuoteLoaded) return false
    return !!activeQuoteErrors?.length || !!quoteRequestErrors?.length
  }, [activeQuoteErrors?.length, isAnyTradeQuoteLoaded, quoteRequestErrors?.length])

  const isLoading = useMemo(() => {
    return isParentLoading || isSellAddressByteCodeLoading || isReceiveAddressByteCodeLoading
  }, [isParentLoading, isReceiveAddressByteCodeLoading, isSellAddressByteCodeLoading])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      // don't allow executing a quote with errors
      quoteHasError ||
      // don't execute trades while address is validating
      manualReceiveAddressIsValidating ||
      manualReceiveAddressIsEditing ||
      manualReceiveAddressIsValid === false ||
      // don't execute trades while in loading state
      isLoading ||
      // don't execute trades for smart contract addresses where they aren't supported
      disableSmartContractSwap ||
      // don't allow non-existent quotes to be executed
      !activeSwapperName ||
      !activeQuote ||
      !hasUserEnteredAmount ||
      // don't allow users to execute trades while the quote is being updated
      isTradeQuoteApiQueryPending[activeSwapperName] ||
      // don't allow users to proceed until a swapper has been selected
      !activeSwapperName
    )
  }, [
    quoteHasError,
    manualReceiveAddressIsValidating,
    manualReceiveAddressIsEditing,
    manualReceiveAddressIsValid,
    isLoading,
    disableSmartContractSwap,
    activeSwapperName,
    activeQuote,
    hasUserEnteredAmount,
    isTradeQuoteApiQueryPending,
  ])

  const quoteStatusTranslation = useMemo(() => {
    const quoteRequestError = quoteRequestErrors[0]
    const quoteResponseError = quoteResponseErrors[0]
    const tradeQuoteError = activeQuoteErrors?.[0]
    switch (true) {
      case !isAnyTradeQuoteLoaded:
      case !hasUserEnteredAmount:
        return 'trade.previewTrade'
      case !!quoteRequestError:
        return getQuoteRequestErrorTranslation(quoteRequestError)
      case !!quoteResponseError:
        return getQuoteRequestErrorTranslation(quoteResponseError)
      case !!tradeQuoteError:
        return getQuoteErrorTranslation(tradeQuoteError!)
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
    isAnyTradeQuoteLoaded,
    hasUserEnteredAmount,
    isConnected,
    isDemoWallet,
  ])

  const handleOpenCompactQuoteList = useCallback(() => {
    if (!isCompact && !isSmallerThanXl) return
    history.push({ pathname: TradeRoutePaths.QuoteList })
  }, [history, isCompact, isSmallerThanXl])

  const nativeAssetBridgeWarning: string | [string, InterpolationOptions] | undefined =
    useMemo(() => {
      if (!buyAssetFeeAsset) return
      // TODO(gomes): Bring me in for all bridges?
      const isArbitrumBridgeDeposit =
        (activeQuote as ArbitrumBridgeTradeQuote)?.direction === 'deposit'

      if (isArbitrumBridgeDeposit)
        return [
          'bridge.nativeAssetWarning',
          {
            destinationSymbol: buyAssetFeeAsset.symbol,
            destinationChainName: buyAssetFeeAsset.networkName,
          },
        ]
    }, [activeQuote, buyAssetFeeAsset])

  const shouldForceManualAddressEntry = useMemo(() => {
    return Boolean(_isSmartContractSellAddress) && sellAsset?.chainId !== buyAsset.chainId
  }, [_isSmartContractSellAddress, sellAsset, buyAsset])

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
          shouldUse={Boolean(receiveAddress) && !shouldForceManualAddressEntry}
          component={RecipientAddress}
        />
        <WithLazyMount
          shouldUse={!walletSupportsBuyAssetChain || shouldForceManualAddressEntry}
          shouldForceManualAddressEntry={shouldForceManualAddressEntry}
          component={ManualAddressEntry}
          description={
            shouldForceManualAddressEntry
              ? translate('trade.smartContractReceiveAddressDescription', {
                  chainName: buyAssetFeeAsset?.networkName,
                })
              : undefined
          }
        />

        <Button
          type='submit'
          colorScheme={quoteHasError ? 'red' : 'blue'}
          size='lg-multiline'
          data-test='trade-form-preview-button'
          isDisabled={shouldDisablePreviewButton}
          mx={-2}
        >
          <Text translation={quoteStatusTranslation} />
        </Button>
      </CardFooter>
    </>
  )
}
