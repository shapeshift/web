import { CardFooter, useMediaQuery } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type {
  AmountDisplayMeta,
  ProtocolFee,
  SwapperName,
  SwapSource,
} from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { BigNumber } from '@shapeshiftoss/utils'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeInput/components/ReceiveSummary'
import { RecipientAddress } from 'components/MultiHopTrade/components/TradeInput/components/RecipientAddress'
import { WithLazyMount } from 'components/MultiHopTrade/components/TradeInput/components/WithLazyMount'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useWalletSupportsChain } from 'hooks/useWalletSupportsChain/useWalletSupportsChain'
import { selectFeeAssetById, selectIsAccountsMetadataLoading } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { ManualAddressEntry } from '../TradeInput/components/ManualAddressEntry'

type SharedTradeInputFooterProps = {
  isCompact: boolean | undefined
  isLoading: boolean
  receiveAddress: string | undefined
  affiliateBps: string | undefined
  affiliateFeeAfterDiscountUserCurrency: string | undefined
  buyAmountAfterFeesCryptoPrecision: string | undefined
  intermediaryTransactionOutputs: AmountDisplayMeta[] | undefined
  buyAsset: Asset
  children: JSX.Element
  hasUserEnteredAmount: boolean
  inputAmountUsd: string | undefined
  isError: boolean
  manualAddressEntryDescription: string | undefined
  priceImpactPercentage: BigNumber | undefined
  quoteStatusTranslation: string | [string, InterpolationOptions]
  rate: string | undefined
  recipientAddressDescription: string | undefined
  sellAsset: Asset
  sellAssetAccountId: string | undefined
  shouldDisablePreviewButton: boolean | undefined
  shouldForceManualAddressEntry: boolean
  slippageDecimal: string
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  totalNetworkFeeFiatPrecision: string
  totalProtocolFees: Record<AssetId, ProtocolFee> | undefined
  onRateClick: () => void
}

export const SharedTradeInputFooter = ({
  affiliateBps,
  affiliateFeeAfterDiscountUserCurrency,
  buyAmountAfterFeesCryptoPrecision,
  intermediaryTransactionOutputs,
  buyAsset,
  children,
  hasUserEnteredAmount,
  inputAmountUsd,
  isCompact,
  isError,
  isLoading: isParentLoading,
  manualAddressEntryDescription,
  onRateClick,
  priceImpactPercentage,
  quoteStatusTranslation,
  rate,
  receiveAddress,
  recipientAddressDescription,
  sellAsset,
  sellAssetAccountId,
  shouldDisablePreviewButton: parentShouldDisablePreviewButton,
  shouldForceManualAddressEntry,
  slippageDecimal,
  swapperName,
  swapSource,
  totalNetworkFeeFiatPrecision,
  totalProtocolFees,
}: SharedTradeInputFooterProps) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })
  const {
    state: { wallet },
  } = useWallet()

  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )
  const isAccountsMetadataLoading = useAppSelector(selectIsAccountsMetadataLoading)
  const walletSupportsBuyAssetChain = useWalletSupportsChain(buyAsset.chainId, wallet)

  const displayManualAddressEntry = useMemo(() => {
    if (isAccountsMetadataLoading && !sellAssetAccountId) return false
    if (!walletSupportsBuyAssetChain) return true
    if (shouldForceManualAddressEntry) return true

    return false
  }, [
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
              symbol={buyAsset.symbol}
              amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
              protocolFees={totalProtocolFees}
              slippageDecimalPercentage={slippageDecimal}
              swapperName={swapperName ?? ''}
              defaultIsOpen={true}
              swapSource={swapSource}
              priceImpact={priceImpactPercentage}
              inputAmountUsd={inputAmountUsd}
              affiliateBps={affiliateBps}
              affiliateFeeAfterDiscountUserCurrency={affiliateFeeAfterDiscountUserCurrency}
              intermediaryTransactionOutputs={intermediaryTransactionOutputs}
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
          chainId={buyAsset.chainId}
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
