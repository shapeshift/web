import { CardFooter, useMediaQuery } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { RecipientAddress } from 'components/MultiHopTrade/components/TradeInput/components/RecipientAddress'
import { WithLazyMount } from 'components/MultiHopTrade/components/TradeInput/components/WithLazyMount'
import { Text } from 'components/Text'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { ManualAddressEntry } from '../../TradeInput/components/ManualAddressEntry'
import { ReceiveSummary } from './components/ReceiveSummary'

type SharedTradeInputFooterProps = {
  affiliateBps: string | undefined
  affiliateFeeAfterDiscountUserCurrency: string | undefined
  buyAsset: Asset
  children?: JSX.Element
  hasUserEnteredAmount: boolean
  inputAmountUsd: string | undefined
  isCompact: boolean | undefined
  isError: boolean
  isLoading: boolean
  manualAddressEntryDescription: string | undefined
  quoteStatusTranslation: string | [string, InterpolationOptions]
  rate: string | undefined
  receiveAddress: string | undefined
  recipientAddressDescription: string | undefined
  sellAsset: Asset
  sellAssetAccountId: string | undefined
  shouldDisablePreviewButton: boolean | undefined
  shouldForceManualAddressEntry: boolean
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  totalNetworkFeeFiatPrecision: string
  receiveSummaryDetails?: JSX.Element | null
  onRateClick: () => void
}

export const SharedTradeInputFooter = ({
  affiliateBps,
  affiliateFeeAfterDiscountUserCurrency,
  buyAsset,
  children,
  hasUserEnteredAmount,
  inputAmountUsd,
  isCompact,
  isError,
  isLoading: isParentLoading,
  manualAddressEntryDescription,
  quoteStatusTranslation,
  rate,
  receiveAddress,
  recipientAddressDescription,
  sellAsset,
  sellAssetAccountId,
  shouldDisablePreviewButton: parentShouldDisablePreviewButton,
  shouldForceManualAddressEntry,
  swapperName,
  swapSource,
  totalNetworkFeeFiatPrecision,
  receiveSummaryDetails,
  onRateClick,
}: SharedTradeInputFooterProps) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const {
    state: { isConnected, wallet },
  } = useWallet()

  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )

  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)

  const displayManualAddressEntry = useMemo(() => {
    if (!isConnected) return false
    if (isAccountsMetadataLoading && !sellAssetAccountId) return false
    if (!walletSupportsBuyAssetChain) return true
    if (shouldForceManualAddressEntry) return true

    return false
  }, [
    isConnected,
    isAccountsMetadataLoading,
    sellAssetAccountId,
    walletSupportsBuyAssetChain,
    shouldForceManualAddressEntry,
  ])

  const isLoading = useMemo(() => {
    return isParentLoading || !buyAssetFeeAsset
  }, [buyAssetFeeAsset, isParentLoading])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      parentShouldDisablePreviewButton ||
      (isAccountsMetadataLoading && !sellAssetAccountId) ||
      // don't allow executing a quote with errors
      isError ||
      // don't execute trades while in loading state
      isLoading
    )
  }, [
    parentShouldDisablePreviewButton,
    isAccountsMetadataLoading,
    sellAssetAccountId,
    isError,
    isLoading,
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
            rate={rate}
            isLoading={isLoading}
            swapperName={swapperName}
            swapSource={swapSource}
            onRateClick={onRateClick}
            allowSelectQuote={Boolean(isSmallerThanXl || isCompact)}
          >
            <ReceiveSummary
              isLoading={isLoading}
              swapperName={swapperName}
              swapSource={swapSource}
              inputAmountUsd={inputAmountUsd}
              affiliateBps={affiliateBps}
              affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
            >
              {receiveSummaryDetails}
            </ReceiveSummary>
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
        {children}
        <WithLazyMount
          shouldUse={Boolean(receiveAddress) && shouldForceManualAddressEntry === false}
          shouldForceManualAddressEntry={shouldForceManualAddressEntry}
          component={RecipientAddress}
          description={recipientAddressDescription}
        />
        <WithLazyMount
          shouldUse={displayManualAddressEntry}
          shouldForceManualAddressEntry={shouldForceManualAddressEntry}
          component={ManualAddressEntry}
          description={manualAddressEntryDescription}
        />

        <ButtonWalletPredicate
          isLoading={isAccountsMetadataLoading && !sellAssetAccountId}
          loadingText={buttonText}
          type='submit'
          colorScheme={isError ? 'red' : 'blue'}
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
