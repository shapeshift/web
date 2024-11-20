import { CardFooter } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import { useMemo } from 'react'
import { ButtonWalletPredicate } from 'components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { Text } from 'components/Text'
import { useAccountsFetchQuery } from 'context/AppProvider/hooks/useAccountsFetchQuery'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ReceiveSummary } from './components/ReceiveSummary'

type SharedTradeInputFooterProps = {
  affiliateBps: string | undefined
  affiliateFeeAfterDiscountUserCurrency: string | undefined
  buyAsset: Asset
  children?: JSX.Element
  hasUserEnteredAmount: boolean
  inputAmountUsd: string | undefined
  isError: boolean
  isLoading: boolean
  quoteStatusTranslation: string | [string, InterpolationOptions]
  rate: string | undefined
  receiveSummaryDetails?: JSX.Element | null
  sellAccountId: string | undefined
  sellAsset: Asset
  shouldDisableGasRateRowClick?: boolean
  shouldDisablePreviewButton: boolean | undefined
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  networkFeeFiatUserCurrency: string | undefined
  onGasRateRowClick?: () => void
}

export const SharedTradeInputFooter = ({
  affiliateBps,
  affiliateFeeAfterDiscountUserCurrency,
  buyAsset,
  children,
  hasUserEnteredAmount,
  inputAmountUsd,
  isError,
  isLoading: isParentLoading,
  quoteStatusTranslation,
  rate,
  receiveSummaryDetails,
  sellAccountId,
  sellAsset,
  shouldDisableGasRateRowClick,
  shouldDisablePreviewButton: parentShouldDisablePreviewButton,
  swapperName,
  swapSource,
  networkFeeFiatUserCurrency,
  onGasRateRowClick,
}: SharedTradeInputFooterProps) => {
  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )

  const { isFetching: isAccountsMetadataLoading } = useAccountsFetchQuery()

  const isLoading = useMemo(() => {
    return isParentLoading || !buyAssetFeeAsset
  }, [buyAssetFeeAsset, isParentLoading])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      parentShouldDisablePreviewButton ||
      (isAccountsMetadataLoading && !sellAccountId) ||
      // don't allow executing a quote with errors
      isError ||
      // don't execute trades while in loading state
      isLoading
    )
  }, [
    parentShouldDisablePreviewButton,
    isAccountsMetadataLoading,
    sellAccountId,
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
            buyAssetSymbol={buyAsset.symbol}
            sellAssetSymbol={sellAsset.symbol}
            isDisabled={shouldDisableGasRateRowClick}
            rate={rate}
            isLoading={isLoading}
            networkFeeFiatUserCurrency={networkFeeFiatUserCurrency}
            swapperName={swapperName}
            swapSource={swapSource}
            onClick={onGasRateRowClick}
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

        <ButtonWalletPredicate
          isLoading={isAccountsMetadataLoading && !sellAccountId}
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
