import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Link, Text as CText, usePrevious, useToast } from '@chakra-ui/react'
import { fromAccountId } from '@shapeshiftoss/caip'
import { cowSwapTokenToAssetId } from '@shapeshiftoss/swapper'
import type { Order } from '@shapeshiftoss/types'
import { OrderStatus } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useGetLimitOrdersQuery } from '@/state/apis/limit-orders/limitOrderApi'
import { actionSlice } from '@/state/slices/actionSlice/actionSlice'
import { isLimitOrderAction } from '@/state/slices/actionSlice/types'
import {
  selectAssetById,
  selectEvmAccountIds,
  selectLimitOrderActionByLimitOrderId,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

export const useLimitOrdersQuery = () => {
  const evmAccountIds = useAppSelector(selectEvmAccountIds)

  return useGetLimitOrdersQuery(evmAccountIds, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: false,
    skip: !evmAccountIds.length,
  })
}

export const useLimitOrders = () => {
  const limitOrdersQuery = useLimitOrdersQuery()
  const toast = useToast()
  const translate = useTranslate()
  const prevLimitOrdersData = usePrevious(limitOrdersQuery.currentData)
  const actions = useAppSelector(actionSlice.selectors.selectActions)

  useEffect(() => {
    if (!prevLimitOrdersData || !limitOrdersQuery.currentData) return

    // Introspects the current limit orders data to check if some orders got *newly* full filled from last query
    // Note this says full filled and now fulfilled, as we are not displaying partial fills for now
    // We will probably want to follow-up on this and display partial fills change, too?
    const newlyFilledOrders = limitOrdersQuery.currentData.filter(current => {
      const prevOrder = prevLimitOrdersData.find(prev => prev.order.uid === current.order.uid)

      return (
        prevOrder &&
        prevOrder.order.status !== OrderStatus.FULFILLED &&
        current.order.status === OrderStatus.FULFILLED
      )
    })

    newlyFilledOrders.forEach(filledOrder => {
      const state = store.getState()

      const { order } = filledOrder
      const { sellToken, buyToken, executedSellAmount, executedBuyAmount } = order

      const { chainId } = fromAccountId(filledOrder.accountId)
      const sellAssetId = cowSwapTokenToAssetId(chainId, sellToken)
      const buyAssetId = cowSwapTokenToAssetId(chainId, buyToken)
      const sellAsset = selectAssetById(state, sellAssetId)
      const buyAsset = selectAssetById(state, buyAssetId)

      if (!(sellAsset && buyAsset)) return

      const sellAmountCryptoPrecision = fromBaseUnit(executedSellAmount, sellAsset.precision)
      const buyAmountCryptoPrecision = fromBaseUnit(executedBuyAmount, buyAsset.precision)

      const assetToAssetTranslation = translate(
        ...[
          'limitOrder.assetToAsset',
          {
            sellAmount: sellAmountCryptoPrecision,
            sellAsset: sellAsset.symbol,
            buyAmount: buyAmountCryptoPrecision,
            buyAsset: buyAsset.symbol,
          },
        ],
      )

      toast({
        title: translate('limitOrder.limitOrderFilled'),
        description: (
          <Box>
            <CText mb={2}>{translate(assetToAssetTranslation)}</CText>
            <Link href={`https://explorer.cow.fi/orders/${order.uid}`} isExternal>
              {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
            </Link>
          </Box>
        ),
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
    })
  }, [limitOrdersQuery.currentData, prevLimitOrdersData, toast, translate])

  const ordersByActionId = useMemo(() => {
    return (limitOrdersQuery.data ?? []).reduce<Record<string, Order>>((acc, order) => {
      const action = actions.find(
        action =>
          isLimitOrderAction(action) && action.limitOrderMetadata?.limitOrderId === order.order.uid,
      )

      if (!action) return acc

      acc[action.id] = order.order
      return acc
    }, {})
  }, [limitOrdersQuery.data, actions])

  return {
    ...limitOrdersQuery,
    ordersByActionId,
  }
}
