import type { CardFooterProps } from '@chakra-ui/react'
import { CardFooter, Flex } from '@chakra-ui/react'
import type { SwapperName, SwapSource } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { InterpolationOptions } from 'node-polyglot'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'

import { ReceiveSummary } from './components/ReceiveSummary'

import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RateGasRow } from '@/components/MultiHopTrade/components/RateGasRow'
import { SwapperIcons } from '@/components/MultiHopTrade/components/SwapperIcons'
import { Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import { selectFeeAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type SharedTradeInputFooterProps = {
  affiliateBps: string
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

const footerBgProp = {
  base: 'background.surface.base',
  md: 'transparent',
}
const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

export const SharedTradeInputFooter = ({
  affiliateBps,
  buyAsset,
  children,
  hasUserEnteredAmount,
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

  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const isLoading = useMemo(() => {
    return isParentLoading || !buyAssetFeeAsset
  }, [buyAssetFeeAsset, isParentLoading])

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      parentShouldDisablePreviewButton ||
      (isDiscoveringAccounts && !sellAccountId) ||
      // don't allow executing a quote with errors
      isError ||
      // don't execute trades while in loading state
      isLoading
    )
  }, [parentShouldDisablePreviewButton, isDiscoveringAccounts, sellAccountId, isError, isLoading])

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

  const handleClick = useCallback(() => {
    vibrate('heavy')
  }, [])

  const swapperIcon = useMemo(() => {
    return <SwapperIcons swapSource={swapSource} swapperName={swapperName} />
  }, [swapSource, swapperName])

  return (
    <CardFooter
      flexDir='column'
      px={0}
      py={0}
      position={footerPosition}
      bottom={'var(--mobile-nav-offset)'}
      bg={footerBgProp}
    >
      <Flex
        borderTopWidth={1}
        borderColor={hasUserEnteredAmount ? 'border.subtle' : 'transparent'}
        flexDir='column'
        gap={4}
        width='full'
      >
        {hasUserEnteredAmount && (
          <RateGasRow
            affiliateBps={affiliateBps}
            buyAssetSymbol={buyAsset.symbol}
            sellAssetSymbol={sellAsset.symbol}
            rate={rate}
            deltaPercentage={deltaPercentage?.toString()}
            isLoading={isLoading && !rate}
            networkFeeFiatUserCurrency={networkFeeFiatUserCurrency}
            icon={swapperIcon}
            invertRate={invertRate}
            noExpand={noExpand}
          >
            <ReceiveSummary isLoading={isLoading}>{receiveSummaryDetails}</ReceiveSummary>
          </RateGasRow>
        )}
      </Flex>
      <Flex
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={4}
        py={4}
        bg={footerBgProp}
        borderBottomRadius='xl'
        width='full'
      >
        {children}

        <ButtonWalletPredicate
          isLoading={isLoading || (isDiscoveringAccounts && !sellAccountId)}
          loadingText={isLoading ? undefined : buttonText}
          type='submit'
          colorScheme={isError ? 'red' : 'blue'}
          size='lg-multiline'
          data-test='trade-form-preview-button'
          isDisabled={shouldDisablePreviewButton}
          isValidWallet={true}
          onClick={handleClick}
        >
          {buttonText}
        </ButtonWalletPredicate>
      </Flex>
    </CardFooter>
  )
}
