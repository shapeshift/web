import { usePrevious, useToast } from '@chakra-ui/react'
import { OrderStatus } from '@shapeshiftoss/types'
import { useEffect } from 'react'

import { useGetLimitOrdersQuery } from '@/state/apis/limit-orders/limitOrderApi'
import { selectEvmAccountIds } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useLimitOrders = () => {
  const evmAccountIds = useAppSelector(selectEvmAccountIds)
  const toast = useToast()

  const limitOrdersQuery = useGetLimitOrdersQuery(evmAccountIds, {
    pollingInterval: 15_000,
    refetchOnMountOrArgChange: false,
    skip: !evmAccountIds.length,
  })

  const prevLimitOrdersData = usePrevious(limitOrdersQuery.data)

  // Check for newly filled orders and show toast
  useEffect(() => {
    if (!prevLimitOrdersData || !limitOrdersQuery.data) return

    const newlyFilledOrders = limitOrdersQuery.data.filter(current => {
      // Find the same order in previous data
      const prevOrder = prevLimitOrdersData.find(
        prev => prev.order.uid === current.order.uid
      )
      
      // If order wasn't filled before but is now filled, return true
      return (
        prevOrder && 
        prevOrder.order.status !== OrderStatus.FULFILLED && 
        current.order.status === OrderStatus.FULFILLED
      )
    })

    // Show toast for each newly filled order
    newlyFilledOrders.forEach(filledOrder => {
      toast({
        title: 'Limit order filled',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top-right',
      })
    })
  }, [limitOrdersQuery.data, prevLimitOrdersData, toast])

  return limitOrdersQuery
}
