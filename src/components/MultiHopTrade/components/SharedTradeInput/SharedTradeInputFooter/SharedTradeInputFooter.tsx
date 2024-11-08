import { CardFooter, useMediaQuery } from '@chakra-ui/react'
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
import { breakpoints } from 'theme/theme'

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
  quoteStatusTranslation: string | [string, InterpolationOptions]
  rate: string | undefined
  sellAsset: Asset
  sellAccountId: string | undefined
  shouldDisablePreviewButton: boolean | undefined
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
  quoteStatusTranslation,
  rate,
  sellAsset,
  sellAccountId,
  shouldDisablePreviewButton: parentShouldDisablePreviewButton,
  swapperName,
  swapSource,
  totalNetworkFeeFiatPrecision,
  receiveSummaryDetails,
  onRateClick,
}: SharedTradeInputFooterProps) => {
  const [isSmallerThanXl] = useMediaQuery(`(max-width: ${breakpoints.xl})`, { ssr: false })

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
