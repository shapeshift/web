import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  Center,
  Flex,
  Heading,
  HStack,
  Link,
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
import type { CowSwapError } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { bnOrZero } from '@shapeshiftoss/utils'
import { formatDistanceToNow } from 'date-fns'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIconWithBadge } from 'components/AssetIconWithBadge'
import { SwapBoldIcon } from 'components/Icons/SwapBold'
import { Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { TransactionTypeIcon } from 'components/TransactionHistory/TransactionTypeIcon'
import { TransactionDate } from 'components/TransactionHistoryRows/TransactionDate'
import { useActions } from 'hooks/useActions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useWallet } from 'hooks/useWallet/useWallet'
import { useCancelLimitOrdersMutation } from 'state/apis/limit-orders/limitOrderApi'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import {
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteFeeAsset,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteNetworkFeeCryptoPrecision,
  selectActiveQuoteSellAsset,
  selectOrderToCancel,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppSelector } from 'state/store'

import { SwapperIcon } from '../../TradeInput/components/SwapperIcon/SwapperIcon'
import { LimitOrderRoutePaths } from '../types'

const cardBorderRadius = { base: '2xl' }

// TODO: Populate this!
const learnMoreUrl = ''

export const CancelLimitOrder = () => {
  const history = useHistory()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const { setOrderToCancel } = useActions(limitOrderSlice.actions)
  const { showErrorToast } = useErrorHandler()

  const orderToCancel = useAppSelector(selectOrderToCancel)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const feeAsset = useAppSelector(selectActiveQuoteFeeAsset)
  const networkFeeCryptoPrecision = useAppSelector(selectActiveQuoteNetworkFeeCryptoPrecision)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  const [cancelLimitOrders, { data, error, isLoading }] = useCancelLimitOrdersMutation()

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
    setOrderToCancel(undefined)
  }, [setOrderToCancel])

  const handleRequestCancellation = useCallback(async () => {
    if (!orderToCancel || !wallet) {
      return
    }

    await cancelLimitOrders({ wallet, ...orderToCancel })
  }, [orderToCancel, cancelLimitOrders, wallet])

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

  if (!orderToCancel) {
    console.error('Attempted to cancel an undefined limit order')
    return null
  }

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
              assetId={orderToCancel.buyAssetId}
              secondaryAssetId={orderToCancel.sellAssetId}
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
                      <Amount.Crypto
                        value={limitPrice.buyAssetDenomination}
                        symbol={buyAsset?.symbol ?? ''}
                      />
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
              <Amount.Crypto value={networkFeeCryptoPrecision} symbol={feeAsset?.symbol ?? ''} />
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
