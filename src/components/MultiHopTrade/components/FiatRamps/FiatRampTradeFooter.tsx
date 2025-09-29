import type { CardFooterProps } from '@chakra-ui/react'
import { CardFooter, Flex } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'

// import { ReceiveSummary } from './components/ReceiveSummary'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import type { FiatRamp } from '@/components/Modals/FiatRamps/config'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { RateGasRow } from '@/components/MultiHopTrade/components/RateGasRow'
import { SharedRecipientAddress } from '@/components/MultiHopTrade/components/SharedTradeInput/SharedRecipientAddress'
import { Text } from '@/components/Text'
import { useDiscoverAccounts } from '@/context/AppProvider/hooks/useDiscoverAccounts'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectFeeAssetById } from '@/state/slices/selectors'
import {
  selectBuyAccountId,
  selectBuyFiatCurrency,
  selectManualReceiveAddress,
  selectSelectedFiatRampQuote,
  selectSellFiatCurrency,
} from '@/state/slices/tradeRampInputSlice/selectors'
import { tradeRampInput } from '@/state/slices/tradeRampInputSlice/tradeRampInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type FiatRampTradeFooterProps = {
  children?: JSX.Element
  hasUserEnteredAmount: boolean
  isError: boolean
  isLoading: boolean
  rate: string | undefined
  shouldDisablePreviewButton: boolean | undefined
  rampName: FiatRamp | undefined
  networkFeeFiatUserCurrency: string | undefined
  marketRate?: string
  invertRate?: boolean
  quoteStatusTranslation: string
  noExpand?: boolean
  icon: React.ReactNode
} & (
  | {
      direction: FiatRampAction.Buy
      buyAsset: Asset
      sellAsset?: never
      sellAccountId?: never
    }
  | {
      direction: FiatRampAction.Sell
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
  direction,
  icon,
  ...props
}: FiatRampTradeFooterProps) => {
  const buyAsset = 'buyAsset' in props ? props.buyAsset : undefined
  const sellAsset = 'sellAsset' in props ? props.sellAsset : undefined
  const sellAccountId = 'sellAccountId' in props ? props.sellAccountId : undefined
  const sellFiatCurrency = useAppSelector(selectSellFiatCurrency)
  const buyFiatCurrency = useAppSelector(selectBuyFiatCurrency)
  const buyAssetFeeAsset = useAppSelector(state =>
    selectFeeAssetById(state, buyAsset?.assetId ?? ''),
  )
  const dispatch = useAppDispatch()
  const selectedQuote = useAppSelector(selectSelectedFiatRampQuote)
  const buyAccountId = useAppSelector(selectBuyAccountId)
  const manualReceiveAddress = useAppSelector(selectManualReceiveAddress)

  const walletReceiveAddress = useMemo(() => {
    return buyAccountId ? fromAccountId(buyAccountId).account : undefined
  }, [buyAccountId])

  const { isFetching: isDiscoveringAccounts } = useDiscoverAccounts()

  const isLoading = useMemo(() => {
    return isParentLoading || (!buyAssetFeeAsset && direction === FiatRampAction.Buy)
  }, [buyAssetFeeAsset, isParentLoading, direction])

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

  const handleIsValidatingChange = useCallback(
    (isValidating: boolean) => {
      dispatch(tradeRampInput.actions.setIsManualReceiveAddressValidating(isValidating))
    },
    [dispatch],
  )

  const handleIsValidChange = useCallback(
    (isValid: boolean) => {
      dispatch(tradeRampInput.actions.setIsManualReceiveAddressValid(isValid))
    },
    [dispatch],
  )

  const handleError = useCallback(() => {
    dispatch(tradeRampInput.actions.setManualReceiveAddress(undefined))
  }, [dispatch])

  const handleEdit = useCallback(() => {
    dispatch(tradeRampInput.actions.setIsManualReceiveAddressEditing(true))
  }, [dispatch])

  const handleCancel = useCallback(() => {
    dispatch(tradeRampInput.actions.setIsManualReceiveAddressEditing(false))
    dispatch(tradeRampInput.actions.setIsManualReceiveAddressValid(undefined))
  }, [dispatch])

  const handleReset = useCallback(() => {
    dispatch(tradeRampInput.actions.setManualReceiveAddress(undefined))
    dispatch(tradeRampInput.actions.setIsManualReceiveAddressValid(undefined))
  }, [dispatch])

  const handleSubmit = useCallback(
    (address: string) => {
      dispatch(tradeRampInput.actions.setManualReceiveAddress(address))
      dispatch(tradeRampInput.actions.setIsManualReceiveAddressEditing(false))
    },
    [dispatch],
  )

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
        {hasUserEnteredAmount && selectedQuote && !isLoading && (
          <RateGasRow
            affiliateBps={'0'}
            buyAssetSymbol={
              direction === FiatRampAction.Buy && buyAsset
                ? buyAsset.symbol
                : buyFiatCurrency?.code ?? 'USD'
            }
            sellAssetSymbol={
              direction === FiatRampAction.Buy && sellFiatCurrency
                ? sellFiatCurrency.code
                : sellAsset?.symbol ?? 'USD'
            }
            rate={rate}
            deltaPercentage={deltaPercentage?.toString()}
            isLoading={isLoading && !rate}
            networkFeeFiatUserCurrency={networkFeeFiatUserCurrency}
            invertRate={invertRate}
            icon={icon}
            noExpand={noExpand}
            hideGasAmount
          />
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
        {direction === FiatRampAction.Buy && buyAsset && (
          <SharedRecipientAddress
            buyAsset={buyAsset}
            isWalletReceiveAddressLoading={false}
            walletReceiveAddress={walletReceiveAddress}
            manualReceiveAddress={manualReceiveAddress}
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
          isValidWallet
        >
          {buttonText}
        </ButtonWalletPredicate>
      </Flex>
    </CardFooter>
  )
}
