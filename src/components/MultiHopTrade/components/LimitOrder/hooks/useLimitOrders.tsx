import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Link, Text as CText, usePrevious } from '@chakra-ui/react'
import { skipToken } from '@reduxjs/toolkit/query'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { cowSwapTokenToAssetId } from '@shapeshiftoss/swapper'
import type { Order } from '@shapeshiftoss/types'
import { OrderStatus } from '@shapeshiftoss/types'
import { fromBaseUnit } from '@shapeshiftoss/utils'
import { useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { useLimitOrdersGraphQLQuery } from '@/lib/graphql/queries/useLimitOrdersQuery'
import { useLimitOrdersRealtimeSubscription } from '@/lib/graphql/useLimitOrdersRealtimeSubscription'
import { useGetLimitOrdersQuery } from '@/state/apis/limit-orders/limitOrderApi'
import { selectPartitionedAccountIds } from '@/state/slices/common-selectors'
import {
  selectAssetById,
  selectLimitOrderActionsByWallet,
  selectPortfolioLoadingStatus,
} from '@/state/slices/selectors'
import { store, useAppSelector } from '@/state/store'

type LimitOrdersQueryResult = {
  data: { order: Order; accountId: AccountId; txHash?: string | null }[] | undefined
  currentData: { order: Order; accountId: AccountId; txHash?: string | null }[] | undefined
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
}

export const useLimitOrdersQuery = (): LimitOrdersQueryResult => {
  const isGraphQLEnabled = useFeatureFlag('GraphQLPoc')
  const { evmAccountIds } = useAppSelector(selectPartitionedAccountIds)
  const portfolioLoadingStatus = useAppSelector(selectPortfolioLoadingStatus)
  const {
    state: { isLoadingLocalWallet, modal, isConnected },
  } = useWallet()

  const shouldSkip =
    !evmAccountIds.length ||
    !isConnected ||
    portfolioLoadingStatus === 'loading' ||
    modal ||
    isLoadingLocalWallet

  const rtkQueryArg = shouldSkip || isGraphQLEnabled ? skipToken : evmAccountIds
  const rtkResult = useGetLimitOrdersQuery(rtkQueryArg, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: false,
  })

  const graphqlQueryEnabled = !shouldSkip && isGraphQLEnabled
  const {
    data: graphqlQueryData,
    isLoading: graphqlQueryLoading,
    isFetching: graphqlQueryFetching,
    error: graphqlQueryError,
  } = useLimitOrdersGraphQLQuery(evmAccountIds, { enabled: graphqlQueryEnabled })

  const { isConnected: isSubscribed, error: subscriptionError } =
    useLimitOrdersRealtimeSubscription(evmAccountIds, !graphqlQueryEnabled)

  const graphqlResult = useMemo((): LimitOrdersQueryResult => {
    if (isGraphQLEnabled) {
      const error = graphqlQueryError ?? subscriptionError ?? null
      return {
        data: graphqlQueryData,
        currentData: graphqlQueryData,
        isLoading: graphqlQueryLoading,
        isFetching: graphqlQueryFetching,
        isError: Boolean(error),
        error: error instanceof Error ? error : error ? new Error(String(error)) : null,
      }
    }

    return {
      data: rtkResult.data,
      currentData: rtkResult.currentData,
      isLoading: rtkResult.isLoading,
      isFetching: rtkResult.isFetching,
      isError: rtkResult.isError,
      error: rtkResult.error ? new Error(String(rtkResult.error)) : null,
    }
  }, [
    isGraphQLEnabled,
    graphqlQueryData,
    graphqlQueryLoading,
    graphqlQueryFetching,
    graphqlQueryError,
    subscriptionError,
    isSubscribed,
    rtkResult,
  ])

  return graphqlResult
}

export const useLimitOrders = () => {
  const limitOrdersQuery = useLimitOrdersQuery()
  const toast = useNotificationToast()
  const translate = useTranslate()
  const prevLimitOrdersData = usePrevious(limitOrdersQuery.currentData)
  const actions = useAppSelector(selectLimitOrderActionsByWallet)
  const isActionCenterEnabled = useFeatureFlag('ActionCenter')

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

      if (!isActionCenterEnabled) {
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
        })
      }
    })
  }, [limitOrdersQuery.currentData, prevLimitOrdersData, toast, translate, isActionCenterEnabled])

  const ordersByActionId = useMemo(() => {
    return (limitOrdersQuery.data ?? []).reduce<Record<string, Order>>((acc, order) => {
      const action = actions.find(
        action => action.limitOrderMetadata?.limitOrderId === order.order.uid,
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
