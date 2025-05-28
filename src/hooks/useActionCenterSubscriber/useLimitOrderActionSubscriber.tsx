import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Link, Text as CText, usePrevious, useToast } from '@chakra-ui/react'
import { OrderStatus } from '@shapeshiftoss/types'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'

import { useLimitOrdersQuery } from '@/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders'
import { actionCenterSlice } from '@/state/slices/actionSlice/actionSlice'
import {
  ActionCenterType,
  ActionStatus,
  isLimitOrderPayloadDiscriminator,
} from '@/state/slices/actionSlice/types'
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
import { selectOpenLimitOrderActionsFilteredByWallet } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

export const useLimitOrderActionSubscriber = () => {
  const dispatch = useAppDispatch()
  const translate = useTranslate()

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
  const toast = useToast()
  const openLimitOrders = useAppSelector(selectOpenLimitOrderActionsFilteredByWallet)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: quoteId ?? 0 }
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
      dispatch(
        actionCenterSlice.actions.upsertAction({
          type: ActionCenterType.LimitOrder,
          status: ActionStatus.Pending,
          title: translate('notificationCenter.notificationTitle', {
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
          metadata: {
            quoteId,
            sellAmountCryptoBaseUnit,
            buyAmountCryptoBaseUnit,
            sellAsset,
            buyAsset,
            limitPrice: {
              [PriceDirection.BuyAssetDenomination]: limitPrice?.buyAssetDenomination ?? '',
              [PriceDirection.SellAssetDenomination]: limitPrice?.sellAssetDenomination ?? '',
            },
            expires: quoteExpirationTimestamp,
            filledDecimalPercentage: '0',
          },
          assetIds: [sellAsset.assetId, buyAsset.assetId],
          initiatorAccountId: accountId,
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

    if (
      limitOrderSubmissionMetadata.limitOrder.orderId &&
      previousLimitOrderId !== limitOrderSubmissionMetadata.limitOrder.orderId
    ) {
      dispatch(
        actionCenterSlice.actions.updateAction({
          status: ActionStatus.Open,
          metadata: {
            quoteId,
            limitOrderId: limitOrderSubmissionMetadata.limitOrder.orderId,
          },
        }),
      )
    }
  }, [dispatch, limitOrderSubmissionMetadata, previousLimitOrderId, quoteId])

  // Update limit order action status when limit order is filled, cancelled or expired
  useEffect(() => {
    if (!ordersResponse) return

    ordersResponse.forEach(order => {
      const updatedLimitOrder = openLimitOrders.find(
        openLimitOrder =>
          isLimitOrderPayloadDiscriminator(openLimitOrder) &&
          openLimitOrder.metadata?.limitOrderId === order.order.uid &&
          order.order.status !== OrderStatus.OPEN,
      )

      if (!updatedLimitOrder) return
      if (!isLimitOrderPayloadDiscriminator(updatedLimitOrder)) return

      if (order.order.status === OrderStatus.FULFILLED) {
        dispatch(
          actionCenterSlice.actions.updateAction({
            metadata: {
              limitOrderId: order.order.uid,
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
              sellAmount: updatedLimitOrder.metadata.sellAmountCryptoBaseUnit,
              sellAsset: updatedLimitOrder.metadata.sellAsset.symbol,
              buyAmount: updatedLimitOrder.metadata.buyAmountCryptoBaseUnit,
              buyAsset: updatedLimitOrder.metadata.buyAsset.symbol,
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
          actionCenterSlice.actions.updateAction({
            metadata: {
              limitOrderId: order.order.uid,
            },
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
          actionCenterSlice.actions.updateAction({
            metadata: {
              limitOrderId: order.order.uid,
            },
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
