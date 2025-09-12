import type { CardFooterProps } from '@chakra-ui/react'
import { CardFooter, Flex } from '@chakra-ui/react'
import type { SwapperName } from '@shapeshiftoss/swapper'
import type { Asset } from '@shapeshiftoss/types'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'

// import { ReceiveSummary } from './components/ReceiveSummary'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { RateGasRow } from '@/components/MultiHopTrade/components/RateGasRow'
import { SharedRecipientAddress } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedRecipientAddress'
import { Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { vibrate } from '@/lib/vibrate'
import { selectFeeAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type FiatRampTradeFooterProps = {
  affiliateBps: string
  affiliateFeeAfterDiscountUserCurrency: string | undefined
  children?: JSX.Element
  hasUserEnteredAmount: boolean
  inputAmountUsd: string | undefined
  isError: boolean
  isLoading: boolean
  rate: string | undefined
  shouldDisablePreviewButton: boolean | undefined
  rampName: SwapperName | undefined
  networkFeeFiatUserCurrency: string | undefined
  marketRate?: string
  invertRate?: boolean
  quoteStatusTranslation: string
  noExpand?: boolean
  icon: React.ReactNode
} & (
  | {
      type: 'buy'
      buyAsset: Asset
      sellAsset?: never
      sellAccountId?: never
    }
  | {
      type: 'sell'
      sellAsset: Asset
      sellAccountId: string | undefined
      buyAsset?: never
    }
)

const footerBgProp = {
  base: 'background.surface.base',
  md: 'transparent',
}
const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

export const FiatRampTradeFooter = ({
  affiliateBps,
  children,
  hasUserEnteredAmount,
  isError,
  isLoading: isParentLoading,
  rate,
  shouldDisablePreviewButton: parentShouldDisablePreviewButton,
  networkFeeFiatUserCurrency,
  marketRate,
  rampName,
  invertRate,
  noExpand,
  quoteStatusTranslation,
  type,
  icon,
  ...props
}: FiatRampTradeFooterProps) => {
  const buyAsset = 'buyAsset' in props ? props.buyAsset : undefined
  const sellAsset = 'sellAsset' in props ? props.sellAsset : undefined
  const sellAccountId = 'sellAccountId' in props ? props.sellAccountId : undefined
  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )

  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const isLoading = useMemo(() => {
    return isParentLoading || (!buyAssetFeeAsset && type === 'buy')
  }, [buyAssetFeeAsset, isParentLoading, type])

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

  const deltaPercentage = useMemo(() => {
    if (!rate || !marketRate || bnOrZero(marketRate).isZero()) return null

    const percentDifference = bnOrZero(rate).minus(marketRate).div(marketRate).times(100)

    if (percentDifference.isZero()) return null

    return percentDifference
  }, [rate, marketRate])

  const handleClick = useCallback(() => {
    vibrate('heavy')
  }, [])

  // @TODO: wire up all those handlers when we have the proper state management for it
  const handleCancel = useCallback(() => {
    vibrate('heavy')
  }, [])

  const handleEdit = useCallback(() => {
    vibrate('heavy')
  }, [])

  const handleError = useCallback(() => {
    vibrate('heavy')
  }, [])

  const handleIsValidatingChange = useCallback(() => {
    vibrate('heavy')
  }, [])

  const handleIsValidChange = useCallback(() => {
    vibrate('heavy')
  }, [])

  const handleReset = useCallback(() => {
    vibrate('heavy')
  }, [])

  const handleSubmit = useCallback(() => {
    vibrate('heavy')
  }, [])

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
        borderColor={'border.subtle'}
        flexDir='column'
        gap={4}
        width='full'
        px={2}
      >
        <RateGasRow
          affiliateBps={affiliateBps}
          // @TODO: Add proper selected fiat
          buyAssetSymbol={type === 'buy' && buyAsset ? buyAsset.symbol : 'USD'}
          sellAssetSymbol={type === 'buy' && sellAsset ? sellAsset.symbol : 'USD'}
          rate={rate}
          deltaPercentage={deltaPercentage?.toString()}
          isLoading={isLoading && !rate}
          networkFeeFiatUserCurrency={networkFeeFiatUserCurrency}
          invertRate={invertRate}
          icon={icon}
          noExpand={noExpand}
        />
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
        {type === 'buy' && buyAsset && (
          <SharedRecipientAddress
            buyAsset={buyAsset}
            isWalletReceiveAddressLoading={false}
            // @TODO: wire up with receive address when we have proper state management
            walletReceiveAddress={'0x0000000000000000000000000000000000000000'}
            manualReceiveAddress={undefined}
            onCancel={handleCancel}
            onEdit={handleEdit}
            onError={handleError}
            onIsValidatingChange={handleIsValidatingChange}
            onIsValidChange={handleIsValidChange}
            onReset={handleReset}
            onSubmit={handleSubmit}
          />
        )}
        {children}

        <ButtonWalletPredicate
          isLoading={isLoading || isDiscoveringAccounts}
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
