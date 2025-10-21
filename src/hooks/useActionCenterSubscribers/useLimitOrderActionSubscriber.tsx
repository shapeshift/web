import { usePrevious } from '@chakra-ui/react'
import { OrderStatus } from '@shapeshiftoss/types'
import { bnOrZero, fromBaseUnit } from '@shapeshiftoss/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { v4 as uuidv4 } from 'uuid'

import { useLocaleFormatter } from '../useLocaleFormatter/useLocaleFormatter'
import { useNotificationToast } from '../useNotificationToast'

import { useActionCenterContext } from '@/components/Layout/Header/ActionCenter/ActionCenterContext'
import { LimitOrderNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/LimitOrderNotification'
import { useLimitOrders } from '@/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import type { LimitOrderAction } from '@/state/slices/actionSlice/types'
import { ActionStatus, ActionType } from '@/state/slices/actionSlice/types'
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
  selectLimitOrderActionsByWallet,
  selectOpenLimitOrderActionsFilteredByWallet,
  selectWalletLimitOrderActionByCowSwapQuoteId,
} from '@/state/slices/selectors'
import { store, useAppDispatch, useAppSelector, useSelectorWithArgs } from '@/state/store'

export const useLimitOrderActionSubscriber = () => {
  const { isDrawerOpen, openActionCenter } = useActionCenterContext()
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
  const activeQuoteId = useAppSelector(selectActiveQuoteId)
  const { currentData: ordersResponse } = useLimitOrders()
  const toast = useNotificationToast({ duration: isDrawerOpen ? 5000 : null })
  const previousIsDrawerOpen = usePrevious(isDrawerOpen)
  const openLimitOrders = useAppSelector(selectOpenLimitOrderActionsFilteredByWallet)
  const quoteExpirationTimestamp = useAppSelector(selectActiveQuoteExpirationTimestamp)

  const orderSubmissionMetadataFilter = useMemo(() => {
    // Sounds dangerous but it's actually safe because it would return an undefined order
    // and so will all the logic will early return
    return { cowSwapQuoteId: activeQuoteId ?? 0 }
  }, [activeQuoteId])

  const limitOrderSubmissionMetadata = useSelectorWithArgs(
    selectLimitOrderSubmissionMetadata,
    orderSubmissionMetadataFilter,
  )

  const previousLimitOrderState = usePrevious(limitOrderSubmissionMetadata?.state)
  const previousLimitOrderId = usePrevious(limitOrderSubmissionMetadata?.limitOrder.orderId)
  const limitPrice = useAppSelector(selectActiveQuoteLimitPrice)

  const actions = useAppSelector(selectLimitOrderActionsByWallet)

  useEffect(() => {
    if (isDrawerOpen && !previousIsDrawerOpen) {
      toast.closeAll()
    }
  }, [isDrawerOpen, toast, previousIsDrawerOpen])

  // Create action after user confirmed the intent of placing a limit order
  useEffect(() => {
    if (!limitOrderSubmissionMetadata) return
    if (!sellAsset) return
    if (!buyAsset) return
    if (!activeQuoteId) return
    if (!activeQuote) return

    const accountId = activeQuote.params.accountId

    if (
      limitOrderSubmissionMetadata.state ===
        LimitOrderSubmissionState.AwaitingLimitOrderSubmission &&
      previousLimitOrderState !== LimitOrderSubmissionState.AwaitingLimitOrderSubmission
    ) {
      const action = selectWalletLimitOrderActionByCowSwapQuoteId(store.getState(), {
        cowSwapQuoteId: activeQuoteId,
      })

      if (action) return

      dispatch(
        actionSlice.actions.upsertAction({
          id: uuidv4(),
          type: ActionType.LimitOrder,
          status: ActionStatus.Idle,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          limitOrderMetadata: {
            cowSwapQuoteId: activeQuoteId,
            sellAmountCryptoBaseUnit,
            buyAmountCryptoBaseUnit,
            sellAmountCryptoPrecision: fromBaseUnit(sellAmountCryptoBaseUnit, sellAsset?.precision),
            buyAmountCryptoPrecision: fromBaseUnit(buyAmountCryptoBaseUnit, buyAsset?.precision),
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
    activeQuoteId,
    limitPrice,
  ])

  // Update action with cowswap order id so we can resolve action and executed limit orders later
  useEffect(() => {
    if (!limitOrderSubmissionMetadata) return
    if (!activeQuoteId) return

    if (
      limitOrderSubmissionMetadata.limitOrder.orderId &&
      previousLimitOrderId !== limitOrderSubmissionMetadata.limitOrder.orderId
    ) {
      const action = actions.find(
        action => action.limitOrderMetadata?.cowSwapQuoteId === activeQuoteId,
      )

      if (action && action.type === ActionType.LimitOrder) {
        if (action.limitOrderMetadata.limitOrderId) return

        const updatedAction = {
          ...action,
          status: ActionStatus.Open,
          limitOrderMetadata: {
            ...action.limitOrderMetadata,
            limitOrderId: limitOrderSubmissionMetadata.limitOrder.orderId,
          },
        }

        dispatch(actionSlice.actions.upsertAction(updatedAction))

        toast({
          render: ({ onClose, ...props }) => {
            const handleClick = () => {
              onClose()
              openActionCenter()
            }

            return (
              <LimitOrderNotification
                // eslint-disable-next-line react-memo/require-usememo
                handleClick={handleClick}
                cowSwapQuoteId={activeQuoteId}
                onClose={onClose}
                {...props}
              />
            )
          },
        })
      }
    }
  }, [
    dispatch,
    limitOrderSubmissionMetadata,
    previousLimitOrderId,
    activeQuoteId,
    actions,
    toast,
    openActionCenter,
  ])

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

      if (!updatedLimitOrder) return

      const action = actions.find(
        action => action.limitOrderMetadata?.limitOrderId === order.order.uid,
      )

      if (!action) return

      // Partially filled orders
      if (
        order.order.status === OrderStatus.OPEN &&
        order.order.executedSellAmount !== order.order.sellAmount
      ) {
        if (bnOrZero(order.order.executedSellAmount).eq(0)) return

        const partiallyFilledPercentage = bnOrZero(order.order.executedSellAmount).div(
          order.order.sellAmount,
        )

        const updatedAction: LimitOrderAction = {
          ...action,
          status: ActionStatus.Open,
          limitOrderMetadata: {
            ...action.limitOrderMetadata,
            filledDecimalPercentage: partiallyFilledPercentage.multipliedBy(100).toString(),
          },
        }

        dispatch(actionSlice.actions.upsertAction(updatedAction))

        toast({
          render: props => (
            <LimitOrderNotification
              handleClick={openActionCenter}
              cowSwapQuoteId={updatedAction.limitOrderMetadata.cowSwapQuoteId}
              {...props}
            />
          ),
        })

        return
      }

      if (order.order.status === OrderStatus.FULFILLED && action.status !== ActionStatus.Complete) {
        const updatedAction: LimitOrderAction = {
          ...action,
          limitOrderMetadata: {
            ...action.limitOrderMetadata,
            executedBuyAmountCryptoBaseUnit: order.order.executedBuyAmount,
            executedSellAmountCryptoBaseUnit: order.order.executedSellAmount,
            executedBuyAmountCryptoPrecision: fromBaseUnit(
              order.order.executedBuyAmount,
              action.limitOrderMetadata.buyAsset.precision,
            ),
            executedSellAmountCryptoPrecision: fromBaseUnit(
              order.order.executedSellAmount,
              action.limitOrderMetadata.sellAsset.precision,
            ),
            filledDecimalPercentage: bnOrZero(order.order.executedSellAmount)
              .div(order.order.sellAmount)
              .toString(),
          },
          status: ActionStatus.Complete,
        }

        dispatch(actionSlice.actions.upsertAction(updatedAction))

        toast({
          render: props => (
            <LimitOrderNotification
              handleClick={openActionCenter}
              cowSwapQuoteId={updatedAction.limitOrderMetadata.cowSwapQuoteId}
              {...props}
            />
          ),
        })

        return
      }

      if (
        order.order.status === OrderStatus.CANCELLED &&
        action.status !== ActionStatus.Cancelled
      ) {
        const updatedAction: LimitOrderAction = {
          ...action,
          status: ActionStatus.Cancelled,
        }

        dispatch(actionSlice.actions.upsertAction(updatedAction))

        // @TODO: replace title by the notification UI product prepared
        toast({
          render: props => (
            <LimitOrderNotification
              handleClick={openActionCenter}
              cowSwapQuoteId={updatedAction.limitOrderMetadata.cowSwapQuoteId}
              {...props}
            />
          ),
        })

        return
      }

      if (order.order.status === OrderStatus.EXPIRED && action.status !== ActionStatus.Expired) {
        const updatedAction: LimitOrderAction = {
          ...action,
          status: ActionStatus.Expired,
        }

        dispatch(actionSlice.actions.upsertAction(updatedAction))

        // @TODO: replace title by the notification UI product prepared
        toast({
          render: props => (
            <LimitOrderNotification
              handleClick={openActionCenter}
              cowSwapQuoteId={updatedAction.limitOrderMetadata.cowSwapQuoteId}
              {...props}
            />
          ),
        })

        return
      }
    })
  }, [
    ordersResponse,
    limitOrderSubmissionMetadata,
    dispatch,
    toast,
    openLimitOrders,
    translate,
    actions,
    openActionCenter,
  ])
}
