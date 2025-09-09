import { WarningIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertIcon,
  Button,
  CloseButton,
  Flex,
  HStack,
  Icon,
  IconButton,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback } from 'react'
import { TbPencil } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { AnimatedCheck } from '../AnimatedCheck'
import { useMixpanel } from '../MultiHopTrade/components/TradeConfirm/hooks/useMixpanel'
import { TooltipWithTouch } from '../TooltipWithTouch'
import { useQuickBuy } from './hooks/useQuickBuy'
import { QuickBuyTradeButton } from './QuickBuyTradeButton'

import { Amount } from '@/components/Amount/Amount'
import { useLocaleFormatter } from '@/hooks/useLocaleFormatter/useLocaleFormatter'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { TradeExecutionState } from '@/state/slices/tradeQuoteSlice/types'

const editIcon = <Icon as={TbPencil} boxSize={6} color='text.subtle' />

type QuickBuyProps = {
  assetId: AssetId
  onEditAmounts: () => void
}

export const QuickBuy: React.FC<QuickBuyProps> = ({ assetId, onEditAmounts }) => {
  const translate = useTranslate()
  const { number } = useLocaleFormatter()
  const {
    quickBuyState,
    isNativeAsset,
    estimatedBuyAmountCryptoPrecision,
    asset,
    feeAsset,
    feeAssetBalanceCryptoPrecision,
    feeAssetBalanceUserCurrency,
    quickBuyAmounts,
    confirmedQuote,
    tradeQuoteStep,
    confirmedTradeExecutionState,
    currentHopIndex,
    actions,
  } = useQuickBuy({ assetId })

  const { startPurchase, confirmPurchase, cancelPurchase, dismissError } = actions

  const handleEditAmounts = useCallback((): void => {
    onEditAmounts()
  }, [onEditAmounts])

  const handleDismissError = useCallback((): void => {
    dismissError()
  }, [dismissError])

  const handleCancelPurchase = useCallback((): void => {
    cancelPurchase()
  }, [cancelPurchase])

  const trackMixpanelEvent = useMixpanel()

  const handleConfirmPurchase = useCallback((): void => {
    trackMixpanelEvent(MixPanelEvent.QuickBuyConfirm)
    confirmPurchase()
  }, [confirmPurchase, trackMixpanelEvent])

  if (isNativeAsset) {
    // We use native asset as the sell asset right now so can't quick buy it
    return (
      <Stack spacing={4}>
        <Text fontSize='md' fontWeight='normal' color='text.subtle' textAlign='center'>
          {translate('quickBuy.nativeNotAvailable')}
        </Text>
      </Stack>
    )
  }

  return (
    <Stack spacing={4}>
      {quickBuyState.status !== 'confirming' && quickBuyState.status !== 'executing' && (
        <>
          <Text fontSize='md' fontWeight='bold' color='text.subtle' textAlign='center'>
            {translate('quickBuy.title', { assetOnChain: asset?.name ?? '' })}
          </Text>
          <HStack spacing={2}>
            {quickBuyAmounts.map((amount, idx) => {
              const isSuccess =
                quickBuyState.status === 'success' && amount === quickBuyState.amount
              const buttonText = isSuccess ? (
                <AnimatedCheck color='white' boxSize={6} />
              ) : (
                number.toFiat(amount)
              )
              const isNotEnoughFunds = bnOrZero(feeAssetBalanceUserCurrency).lt(amount)
              const insufficientFunds = translate('common.insufficientFunds')
              return (
                <TooltipWithTouch
                  label={isNotEnoughFunds ? insufficientFunds : undefined}
                  flex={1}
                  key={`${amount}-${idx}`}
                >
                  <Button
                    rounded='full'
                    background={isSuccess ? 'green.500' : undefined}
                    // eslint-disable-next-line react-memo/require-usememo
                    onClick={() => {
                      startPurchase(amount)
                    }}
                    flex={1}
                    isDisabled={isNotEnoughFunds}
                    fontSize='lg'
                    fontWeight='semibold'
                  >
                    {buttonText}
                  </Button>
                </TooltipWithTouch>
              )
            })}
            <IconButton
              aria-label={translate('quickBuy.edit')}
              isRound
              onClick={handleEditAmounts}
              icon={editIcon}
            />
          </HStack>
          {quickBuyState.status === 'error' && (
            <Alert
              status='error'
              backgroundColor='background.error'
              borderRadius='md'
              position='relative'
            >
              <AlertIcon as={WarningIcon} />
              <Text fontWeight='normal' fontSize='sm'>
                {translate(quickBuyState.messageKey, {
                  amount: number.toFiat(quickBuyState.amount),
                })}
              </Text>
              <CloseButton onClick={handleDismissError} />
            </Alert>
          )}
          <Flex alignItems='center' justifyContent='space-between'>
            <Text fontSize='md' fontWeight='bold' color='text.subtle'>
              {translate('quickBuy.balance')}
            </Text>
            <Flex>
              <Amount.Fiat color='text.base' value={feeAssetBalanceUserCurrency} pr={1} />
              (
              <Amount.Crypto
                color='text.base'
                value={feeAssetBalanceCryptoPrecision}
                symbol={feeAsset?.symbol ?? ''}
                maximumFractionDigits={6}
              />
              )
            </Flex>
          </Flex>
        </>
      )}

      {(quickBuyState.status === 'confirming' || quickBuyState.status === 'executing') && (
        <Stack gap={4} align='center'>
          <Text fontSize='md' color='text.subtle' fontWeight='bold'>
            {translate('quickBuy.confirm')}
          </Text>

          <Flex flexDir='column' alignItems='center'>
            <Text
              fontSize='4xl'
              lineHeight='120%'
              fontWeight='bold'
              color='text.base'
              mb={0}
              pb={0}
            >
              {number.toFiat(quickBuyState.amount)}
            </Text>

            <Text fontSize='md' color='text.subtle' textAlign='center'>
              {estimatedBuyAmountCryptoPrecision ? (
                <Amount.Crypto
                  value={estimatedBuyAmountCryptoPrecision}
                  symbol={asset?.symbol ?? ''}
                  maximumFractionDigits={6}
                />
              ) : (
                <Skeleton height='20px' width='100px' />
              )}
            </Text>
          </Flex>

          <HStack spacing={3} width='100%'>
            <Button
              rounded='full'
              size='lg'
              onClick={handleCancelPurchase}
              flex={1}
              isDisabled={quickBuyState.status === 'executing'}
            >
              {translate('common.cancel')}
            </Button>
            {confirmedQuote &&
            tradeQuoteStep &&
            (confirmedTradeExecutionState === TradeExecutionState.Previewing ||
              confirmedTradeExecutionState === TradeExecutionState.FirstHop ||
              confirmedTradeExecutionState === TradeExecutionState.SecondHop) ? (
              <QuickBuyTradeButton
                activeTradeId={confirmedQuote.id}
                currentHopIndex={currentHopIndex}
                tradeQuoteStep={tradeQuoteStep}
                onConfirm={handleConfirmPurchase}
              />
            ) : (
              <Button
                rounded='full'
                variant='solid'
                size='lg'
                colorScheme='blue'
                flex={1}
                isDisabled
                isLoading
              />
            )}
          </HStack>
        </Stack>
      )}
    </Stack>
  )
}
