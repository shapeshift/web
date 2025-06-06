import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Flex,
  Icon,
  Link,
  Text as CText,
  useColorModeValue,
  usePrevious,
  useToast,
} from '@chakra-ui/react'
import { OrderStatus } from '@shapeshiftoss/types'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { uuidv4 } from '@walletconnect/utils'
import { useEffect, useMemo } from 'react'
import { TbCircleCheckFilled, TbCircleXFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'

import { useLimitOrdersQuery } from '@/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { ActionStatus, ActionType, isLimitOrderAction } from '@/state/slices/actionSlice/types'
import { PriceDirection } from '@/state/slices/limitOrderInputSlice/constants'
import {
  selectBuyAmountCryptoBaseUnit,
  selectInputSellAmountCryptoBaseUnit,
} from '@/state/slices/limitOrderInputSlice/selectors'
import { LimitOrderSubmissionState } from '@/state/slices/limitOrderSlice/constants'
import { limitOrderSlice } from '@/state/slices/limitOrderSlice/limitOrderSlice'
import {
  selectActiveQuoteBuyAsset,
  selectActiveQuoteExpirationTimestamp,
  selectActiveQuoteId,
  selectActiveQuoteLimitPrice,
  selectActiveQuoteSellAsset,
  selectLimitOrderSubmissionMetadata,
} from '@/state/slices/limitOrderSlice/selectors'
import {
  selectLimitOrderActionByCowSwapQuoteId,
  selectLimitOrderActionByLimitOrderId,
  selectOpenLimitOrderActionsFilteredByWallet,
} from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

type UseLimitOrderActionSubscriberProps = {
  onDrawerOpen: () => void
}

export const useLimitOrderActionSubscriber = ({
  onDrawerOpen,
}: UseLimitOrderActionSubscriberProps) => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()
  const toastColor = useColorModeValue('white', 'gray.900')

  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const activeQuote = useAppSelector(limitOrderSlice.selectors.selectActiveQuote)
  const sellAsset = useAppSelector(selectActiveQuoteSellAsset)
  const buyAsset = useAppSelector(selectActiveQuoteBuyAsset)
  const sellAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const buyAmountCryptoBaseUnit = useAppSelector(selectBuyAmountCryptoBaseUnit)
  const quoteId = useAppSelector(selectActiveQuoteId)
  const { currentData: ordersResponse } = useLimitOrdersQuery()
  const toast = useToast({
    render: ({ title, status, description, onClose }) => {
      const handleClick = () => {
        onClose()
        onDrawerOpen()
      }

      const toastSx = {
        '&:hover': {
          cursor: 'pointer',
          background: status === 'success' ? 'green.300' : 'red.300',
        },
      }

      return (
        <Flex
          // We can't memo this because onClose prop comes from the render props
          // eslint-disable-next-line react-memo/require-usememo
          onClick={handleClick}
          background={status === 'success' ? 'green.500' : 'red.500'}
          color='white'
          px={4}
          py={2}
          borderRadius='md'
          // eslint-disable-next-line react-memo/require-usememo
          sx={toastSx}
        >
          <Box py={1} me={2}>
            {status === 'success' ? (
              <Icon color={toastColor} as={TbCircleCheckFilled} height='20px' width='20px' />
            ) : (
              <Icon color={toastColor} as={TbCircleXFilled} height='20px' width='20px' />
            )}
          </Box>
          <Box>
            <CText fontWeight='bold' color={toastColor}>
              {title}
            </CText>
            <CText color={toastColor}>{description}</CText>
          </Box>
        </Flex>
      )
    },
  })
  const openLimitOrders = useAppSelector(selectOpenLimitOrderActionsFilteredByWallet)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { cowSwapQuoteId: quoteId ?? 0 }
  }, [quoteId])

  const limitOrderSubmissionMetadata = useSelectorWithArgs(
    selectLimitOrderSubmissionMetadata,
    orderSubmissionMetadataFilter,
  )

  const previousLimitOrderState = usePrevious(limitOrderSubmissionMetadata?.state)
  const previousLimitOrderId = usePrevious(limitOrderSubmissionMetadata?.limitOrder.orderId)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)

  // Create action after user confirmed the intent of placing a limit order
  useEffect(() => {
    if (!limitOrderSubmissionMetadata) return
    if (!sellAsset) return
    if (!buyAsset) return
    if (!quoteId) return
    if (!activeQuote) return

    const accountId = activeQuote.params.accountId

    if (
      limitOrderSubmissionMetadata.state ===
        LimitOrderSubmissionState.AwaitingLimitOrderSubmission &&
      previousLimitOrderState !== LimitOrderSubmissionState.AwaitingLimitOrderSubmission
    ) {
      const action = selectLimitOrderActionByCowSwapQuoteId(store.getState(), {
        cowSwapQuoteId: quoteId,
      })

      if (action) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          type: ActionType.LimitOrder,
          status: ActionStatus.Idle,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          title: translate('notificationCenter.limitOrderTitle', {
            sellAmountAndSymbol: toCrypto(
              fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset.precision),
              sellAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
            buyAmountAndSymbol: toCrypto(
              fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset.precision),
              buyAsset.symbol,
              {
                maximumFractionDigits: 8,
                omitDecimalTrailingZeros: true,
                abbreviated: true,
                truncateLargeNumbers: true,
              },
            ),
          }),
          limitOrderMetadata: {
            cowSwapQuoteId: quoteId,
            sellAmountCryptoBaseUnit,
            buyAmountCryptoBaseUnit,
            sellAsset,
            buyAsset,
            accountId,
            limitPrice: {
              [PriceDirection.BuyAssetDenomination]: limitPrice?.buyAssetDenomination ?? '',
              [PriceDirection.SellAssetDenomination]: limitPrice?.sellAssetDenomination ?? '',
            },
            expires: quoteExpirationTimestamp,
            filledDecimalPercentage: '0',
          },
        }),
      )
    }
  }, [
    dispatch,
    translate,
    toCrypto,
    activeQuote,
    previousLimitOrderState,
    limitOrderSubmissionMetadata,
    sellAsset,
    buyAsset,
    sellAmountCryptoBaseUnit,
    buyAmountCryptoBaseUnit,
    quoteExpirationTimestamp,
    quoteId,
    limitPrice,
  ])

  // Update action with cowswap order id so we can resolve action and executed limit orders later
  useEffect(() => {
    if (!limitOrderSubmissionMetadata) return
    if (!quoteId) return

    if (
      limitOrderSubmissionMetadata.limitOrder.orderId &&
      previousLimitOrderId !== limitOrderSubmissionMetadata.limitOrder.orderId
    ) {
      const action = selectLimitOrderActionByCowSwapQuoteId(store.getState(), {
        cowSwapQuoteId: quoteId,
      })

      if (action && action.type === ActionType.LimitOrder) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Open,
            limitOrderMetadata: {
              ...action.limitOrderMetadata,
              limitOrderId: limitOrderSubmissionMetadata.limitOrder.orderId,
            },
          }),
        )
      }
    }
  }, [dispatch, limitOrderSubmissionMetadata, previousLimitOrderId, quoteId])

  // Update limit order action status when limit order is filled, cancelled or expired
  useEffect(() => {
    if (!ordersResponse) return

    ordersResponse.forEach(order => {
      const updatedLimitOrder = openLimitOrders.find(
        openLimitOrder =>
          openLimitOrder.type === ActionType.LimitOrder &&
          openLimitOrder.limitOrderMetadata?.limitOrderId === order.order.uid &&
          order.order.status !== OrderStatus.OPEN,
      )

      if (!updatedLimitOrder || !isLimitOrderAction(updatedLimitOrder)) return

      const action = selectLimitOrderActionByLimitOrderId(store.getState(), {
        limitOrderId: order.order.uid,
      })

      if (!action || action.type !== ActionType.LimitOrder) return

      // Partially filled orders
      if (
        order.order.status === OrderStatus.OPEN &&
        order.order.executedSellAmount !== order.order.sellAmount
      ) {
        if (bnOrZero(order.order.executedSellAmount).eq(0)) return

        const partiallyFilledPercentage = bnOrZero(order.order.executedSellAmount).div(
          order.order.sellAmount,
        )

        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Open,
            limitOrderMetadata: {
              ...action.limitOrderMetadata,
              filledDecimalPercentage: partiallyFilledPercentage.multipliedBy(100).toString(),
            },
          }),
        )

        const assetToAssetTranslation = translate(
          ...[
            'limitOrder.assetToAsset',
            {
              sellAmount: order.order.executedSellAmount,
              sellAsset: updatedLimitOrder.limitOrderMetadata.sellAsset.symbol,
              buyAmount: order.order.executedBuyAmount,
              buyAsset: updatedLimitOrder.limitOrderMetadata.buyAsset.symbol,
            },
          ],
        )

        toast({
          title: translate('limitOrder.limitOrderPartiallyFilled'),
          description: (
            <Box>
              <CText mb={2}>{translate(assetToAssetTranslation)}</CText>
              <Link href={`https://explorer.cow.fi/orders/${order.order.uid}`} isExternal>
                {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
              </Link>
            </Box>
          ),
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        })

        return
      }

      if (order.order.status === OrderStatus.FULFILLED) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            limitOrderMetadata: {
              ...action.limitOrderMetadata,
              executedBuyAmountCryptoBaseUnit: order.order.executedBuyAmount,
              executedSellAmountCryptoBaseUnit: order.order.executedSellAmount,
              filledDecimalPercentage: bnOrZero(order.order.executedSellAmount)
                .div(order.order.sellAmount)
                .toString(),
            },
            status: ActionStatus.Complete,
          }),
        )

        const assetToAssetTranslation = translate(
          ...[
            'limitOrder.assetToAsset',
            {
              sellAmount: order.order.executedSellAmount,
              sellAsset: updatedLimitOrder.limitOrderMetadata.sellAsset.symbol,
              buyAmount: order.order.executedBuyAmount,
              buyAsset: updatedLimitOrder.limitOrderMetadata.buyAsset.symbol,
            },
          ],
        )

        toast({
          title: translate('limitOrder.limitOrderFilled'),
          description: (
            <Box>
              <CText mb={2}>{translate(assetToAssetTranslation)}</CText>
              <Link href={`https://explorer.cow.fi/orders/${order.order.uid}`} isExternal>
                {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
              </Link>
            </Box>
          ),
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right',
        })

        return
      }

      if (order.order.status === OrderStatus.CANCELLED) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Cancelled,
          }),
        )

        toast({
          title: updatedLimitOrder.title,
          status: 'error',
          position: 'top-right',
        })

        return
      }

      if (order.order.status === OrderStatus.EXPIRED) {
        dispatch(
          actionSlice.actions.upsertAction({
            ...action,
            status: ActionStatus.Expired,
          }),
        )

        toast({
          title: updatedLimitOrder.title,
          status: 'error',
          position: 'top-right',
        })

        return
      }
    })
  }, [ordersResponse, limitOrderSubmissionMetadata, dispatch, toast, openLimitOrders, translate])
}
