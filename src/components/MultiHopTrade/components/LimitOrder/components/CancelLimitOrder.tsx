import {
  Button,
  Card,
  Flex,
  Heading,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Stack,
} from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useEffect, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { useCancelLimitOrderMutation } from 'state/apis/limit-orders/limitOrderApi'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
import { useSelectorWithArgs } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { getMixpanelLimitOrderEventData } from '../helpers'
import type { OrderToCancel } from '../types'

const cardBorderRadius = { base: '2xl' }

type CancelLimitOrderProps = {
  orderToCancel: OrderToCancel | undefined
  resetOrderToCancel: () => void
}

export const CancelLimitOrder = ({ orderToCancel, resetOrderToCancel }: CancelLimitOrderProps) => {
  const wallet = useWallet().state.wallet
  const { showErrorToast } = useErrorHandler()
  const queryClient = useQueryClient()
  const mixpanel = getMixPanel()

  const [cancelLimitOrder, { error, isLoading, reset }] = useCancelLimitOrderMutation()

  const sellAsset = useSelectorWithArgs(selectAssetById, orderToCancel?.sellAssetId ?? '')
  const buyAsset = useSelectorWithArgs(selectAssetById, orderToCancel?.buyAssetId ?? '')
  const feeAsset = useSelectorWithArgs(selectFeeAssetById, orderToCancel?.sellAssetId ?? '')

  useEffect(() => {
    if (!error) return

    showErrorToast(error, 'limitOrder.cancel.cancellationFailed')
  }, [error, showErrorToast])

  const buyAmountCryptoPrecision = useMemo(() => {
    if (!orderToCancel || !buyAsset) return '0'
    return fromBaseUnit(orderToCancel.order.buyAmount, buyAsset.precision)
  }, [buyAsset, orderToCancel])

  const sellAmountCryptoPrecision = useMemo(() => {
    if (!orderToCancel || !sellAsset) return '0'
    return fromBaseUnit(orderToCancel.order.sellAmount, sellAsset.precision)
  }, [orderToCancel, sellAsset])

  const handleClose = useCallback(() => {
    reset()
    resetOrderToCancel()
  }, [resetOrderToCancel, reset])

  const handleRequestCancellation = useCallback(async () => {
    if (!orderToCancel || !wallet) {
      return
    }

    await cancelLimitOrder({ wallet, ...orderToCancel })

    // refetch the orders list for this account
    queryClient.invalidateQueries({
      queryKey: ['getLimitOrdersForAccount', orderToCancel.accountId],
    })

    resetOrderToCancel()

    // Track event in mixpanel
    const eventData = getMixpanelLimitOrderEventData({
      sellAsset,
      buyAsset,
      sellAmountCryptoPrecision,
      buyAmountCryptoPrecision,
    })
    if (mixpanel && eventData) {
      mixpanel.track(MixPanelEvent.LimitOrderCanceled, eventData)
    }
  }, [
    orderToCancel,
    wallet,
    cancelLimitOrder,
    queryClient,
    resetOrderToCancel,
    sellAsset,
    buyAsset,
    sellAmountCryptoPrecision,
    buyAmountCryptoPrecision,
    mixpanel,
  ])

  const limitPrice = useMemo(() => {
    if (bnOrZero(sellAmountCryptoPrecision).isZero() || bnOrZero(buyAmountCryptoPrecision).isZero())
      return
    return bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision).toFixed()
  }, [buyAmountCryptoPrecision, sellAmountCryptoPrecision])

  const expiryText = useMemo(() => {
    if (!orderToCancel) return
    const validTo = orderToCancel.order.validTo
    return formatDistanceToNow(validTo * 1000, {
      addSuffix: true,
    })
  }, [orderToCancel])

  const formattedPercentage = useMemo(() => {
    if (!orderToCancel) return '0'
    const filledDecimalPercentage = bnOrZero(orderToCancel.order.executedSellAmount).div(
      orderToCancel.order.sellAmount,
    )
    return filledDecimalPercentage.times(100).toFixed(2)
  }, [orderToCancel])

  return (
    <Modal isOpen={orderToCancel !== undefined} onClose={handleClose}>
      <ModalOverlay />
      <ModalContent pointerEvents='all'>
        <ModalHeader px={6} pt={4} borderWidth={0}>
          <Heading textAlign='center' fontSize='md'>
            <Text translation='limitOrder.cancel.cancelOrder' />
          </Heading>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody px={6} pt={0} pb={6}>
          <Flex flexDir='column' justify='space-between' align='center' gap={4}>
            <AssetIconWithBadge
              size='lg'
              assetId={buyAsset?.assetId ?? ''}
              secondaryAssetId={sellAsset?.assetId ?? ''}
            >
              <TransactionTypeIcon status={TxStatus.Failed} />
            </AssetIconWithBadge>
            <Heading textAlign='center' fontSize='md'>
              <Text translation='limitOrder.cancel.areYouSureYouWantToCancelOrder' />
            </Heading>
          </Flex>
        </ModalBody>
        <ModalFooter
          flexDir='column'
          gap={2}
          px={4}
          borderTopWidth={0}
          fontSize='sm'
          borderBottomRadius={cardBorderRadius}
        >
          <Stack spacing={4} width='full'>
            <Card bg='background.surface.raised.accent' borderRadius='xl' p={4}>
              <Stack spacing={4}>
                <Row px={2}>
                  <Row.Label>
                    <Text translation='limitOrder.limitPrice' />
                  </Row.Label>
                  <Row.Value textAlign='right'>
                    <HStack>
                      <Amount.Crypto value={'1.0'} symbol={sellAsset?.symbol ?? ''} />
                      <RawText>=</RawText>
                      <Amount.Crypto value={limitPrice} symbol={buyAsset?.symbol ?? ''} />
                    </HStack>
                  </Row.Value>
                </Row>
                <Row px={2}>
                  <Row.Label>
                    <Text translation='limitOrder.provider' />
                  </Row.Label>
                  <Row.Value textAlign='right'>
                    <HStack>
                      <SwapperIcon swapperName={SwapperName.CowSwap} />
                      <RawText>{SwapperName.CowSwap}</RawText>
                    </HStack>
                  </Row.Value>
                </Row>
                <Row px={2}>
                  <Row.Label>
                    <Text color='gray.500' translation='limitOrder.status.fulfilled' />
                  </Row.Label>
                  <Row.Value>
                    <RawText>
                      <Flex align='center' gap={4} width='60%'>
                        <Progress
                          value={Number(formattedPercentage)}
                          width='100%'
                          borderRadius='full'
                          colorScheme='green'
                        />
                        <RawText>{`${formattedPercentage}%`}</RawText>
                      </Flex>
                    </RawText>
                  </Row.Value>
                </Row>
                <Row px={2}>
                  <Row.Label>
                    <Text color='gray.500' translation='limitOrder.expiresIn' />
                  </Row.Label>
                  <Row.Value>
                    <RawText>{expiryText}</RawText>
                  </Row.Value>
                </Row>
              </Stack>
            </Card>
            <Row px={2}>
              <Row.Label>
                <Text translation='limitOrder.networkFee' />
              </Row.Label>
              <Amount.Crypto value={'0'} symbol={feeAsset?.symbol ?? ''} />
            </Row>
            <Button
              colorScheme='red'
              size='lg'
              width='full'
              onClick={handleRequestCancellation}
              isLoading={isLoading}
              isDisabled={isLoading}
            >
              <Text translation='limitOrder.cancel.requestCancellation' />
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
