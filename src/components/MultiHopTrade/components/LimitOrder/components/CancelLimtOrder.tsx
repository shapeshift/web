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
import type { CowSwapError } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bn, bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useEffect, useMemo } from 'react'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { useActions } from 'hooks/useActions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useCancelLimitOrdersMutation } from 'state/apis/limit-orders/limitOrderApi'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import { selectOrderToCancel } from 'state/slices/limitOrderSlice/selectors'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector, useSelectorWithArgs } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: '2xl' }

export const CancelLimitOrder = () => {
  const history = useHistory()
  const wallet = useWallet().state.wallet
  const { setOrderToCancel } = useActions(limitOrderSlice.actions)
  const { showErrorToast } = useErrorHandler()

  const orderToCancel = useAppSelector(selectOrderToCancel)

  const [cancelLimitOrders, { data, error, isLoading, reset }] = useCancelLimitOrdersMutation()

  useEffect(() => {
    if (!error) return

    const description = (error as CowSwapError).description ?? 'Unknown Error'

    // TODO: Actually render a translated error description.
    showErrorToast(description)
  }, [error, showErrorToast])

  useEffect(() => {
    if (!data || error) return

    history.push(LimitOrderRoutePaths.PlaceOrder)
  }, [data, error, history])

  const handleClose = useCallback(() => {
    reset()
    setOrderToCancel(undefined)
  }, [setOrderToCancel, reset])

  const handleRequestCancellation = useCallback(async () => {
    if (!orderToCancel || !wallet) {
      return
    }

    await cancelLimitOrders({ wallet, ...orderToCancel })
  }, [orderToCancel, cancelLimitOrders, wallet])

  const sellAsset = useSelectorWithArgs(selectAssetById, orderToCancel?.sellAssetId ?? '')
  const buyAsset = useSelectorWithArgs(selectAssetById, orderToCancel?.buyAssetId ?? '')
  const feeAsset = useSelectorWithArgs(selectFeeAssetById, orderToCancel?.sellAssetId ?? '')

  const limitPrice = useMemo(() => {
    if (!orderToCancel || !sellAsset || !buyAsset) return
    const buyAmountCryptoPrecision = fromBaseUnit(orderToCancel.order.buyAmount, buyAsset.precision)
    const sellAmountCryptoPrecision = fromBaseUnit(
      orderToCancel.order.sellAmount,
      sellAsset.precision,
    )
    return bn(buyAmountCryptoPrecision).div(sellAmountCryptoPrecision).toFixed()
  }, [buyAsset, orderToCancel, sellAsset])

  const expiryText = useMemo(() => {
    const validTo = orderToCancel?.order.validTo
    return validTo
      ? formatDistanceToNow(validTo * 1000, {
          addSuffix: true,
        })
      : undefined
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
            <Text translation='limitOrder.cancelOrder' />
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
              <Text translation='limitOrder.areYouSureYouWantToCancelOrder' />
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
                      {/*
                    TODO: the rate differs from the input page because we're using the quoted values
                    here instead of the user input. We need to decide how to handle this because the
                    quote is likely what gets executed.
                  */}
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
              <Text translation={'limitOrder.requestCancellation'} />
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
