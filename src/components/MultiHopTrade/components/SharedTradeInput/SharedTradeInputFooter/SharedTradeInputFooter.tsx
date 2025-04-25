import { CardFooter } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX } from 'react'
import { useMemo } from 'react'

import { ReceiveSummary } from './components/ReceiveSummary'

import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RateGasRow } from '@/components/MultiHopTrade/components/RateGasRow'
import { Text } from '@/components/Text'
import { useAccountsFetchQuery } from '@/context/AppProvider/hooks/useAccountsFetchQuery'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectFeeAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

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
  shouldDisablePreviewButton: boolean | undefined
  swapperName: SwapperName | undefined
  swapSource: SwapSource | undefined
  networkFeeFiatUserCurrency: string | undefined
  marketRate?: string
  invertRate?: boolean
  noExpand?: boolean
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
  shouldDisablePreviewButton: parentShouldDisablePreviewButton,
  swapperName,
  swapSource,
  networkFeeFiatUserCurrency,
  marketRate,
  invertRate,
  noExpand,
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

  // Calculate the delta percentage between the limit price and market price
  const deltaPercentage = useMemo(() => {
    if (!rate || !marketRate || bnOrZero(marketRate).isZero()) return null

    const percentDifference = bnOrZero(rate).minus(marketRate).div(marketRate).times(100)

    if (percentDifference.isZero()) return null

    return percentDifference
  }, [rate, marketRate])

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
            affiliateBps={affiliateBps}
            buyAssetId={buyAsset.assetId}
            sellAssetId={sellAsset.assetId}
            rate={rate}
            deltaPercentage={deltaPercentage?.toString()}
            isLoading={isLoading && !rate}
            networkFeeFiatUserCurrency={networkFeeFiatUserCurrency}
            swapperName={swapperName}
            swapSource={swapSource}
            invertRate={invertRate}
            noExpand={noExpand}
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
          isLoading={isLoading || (isAccountsMetadataLoading && !sellAccountId)}
          loadingText={isLoading ? undefined : buttonText}
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
