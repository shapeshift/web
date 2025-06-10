import {
  Box,
  Circle,
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Icon,
  IconButton,
  useDisclosure,
} from '@chakra-ui/react'
import type { Order } from '@shapeshiftoss/types'
import { memo, useCallback, useMemo, useState } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { LimitOrderActionCard } from './components/LimitOrderActionCard'
import { SwapActionCard } from './components/SwapActionCard'

import { CancelLimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/components/CancelLimitOrder'
import { useLimitOrders } from '@/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { useLimitOrderActionSubscriber } from '@/hooks/useActionCenterSubscriber/useLimitOrderActionSubscriber'
import { useSwapActionSubscriber } from '@/hooks/useActionCenterSubscriber/useSwapActionSubscriber'
import {
  selectLimitOrderActionByLimitOrderId,
  selectWalletActionsSorted,
  selectWalletHasPendingActions,
} from '@/state/slices/actionSlice/selectors'
import { ActionType } from '@/state/slices/actionSlice/types'
import { store, useAppSelector } from '@/state/store'

const paddingProp = { base: 4, md: 6 }

const ActionCenterIcon = <Icon as={TbBellFilled} />

export const ActionCenter = memo(() => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  useSwapActionSubscriber({ onDrawerOpen: onOpen })
  useLimitOrderActionSubscriber({ onDrawerOpen: onOpen })

  const translate = useTranslate()
  const [orderToCancel, setOrderToCancel] = useState<OrderToCancel | undefined>(undefined)

  const actions = useAppSelector(selectWalletActionsSorted)

  const hasPendingActions = useAppSelector(selectWalletHasPendingActions)
  const limitOrders = useLimitOrders()

  const handleResetOrderToCancel = useCallback(() => {
    setOrderToCancel(undefined)
  }, [])

  const handleSetOrderToCancel = useCallback((orderToCancel: OrderToCancel) => {
    setOrderToCancel(orderToCancel)
  }, [])

  const ordersByActionId = useMemo(() => {
    return limitOrders.data?.reduce(
      (acc, order) => {
        const action = selectLimitOrderActionByLimitOrderId(store.getState(), {
          limitOrderId: order.order.uid,
        })

        if (!action) return acc

        acc[action.id] = order.order
        return acc
      },
      {} as Record<string, Order>,
    )
  }, [limitOrders])

  const actionsCards = useMemo(() => {
    return actions.map(action => {
      const actionsCards = (() => {
        switch (action.type) {
          case ActionType.Swap: {
            return <SwapActionCard key={action.id} {...action} />
          }
          case ActionType.LimitOrder: {
            const order = ordersByActionId?.[action.id]

            if (!order) return null

            return (
              <LimitOrderActionCard
                key={action.id}
                order={order}
                action={action}
                onCancelOrder={handleSetOrderToCancel}
              />
            )
          }
          default:
            return null
        }
      })()

      return actionsCards
    })
  }, [actions, handleSetOrderToCancel, ordersByActionId])

  return (
    <>
      <Box position='relative'>
        <IconButton
          aria-label={translate('navBar.pendingTransactions')}
          icon={ActionCenterIcon}
          onClick={onOpen}
        />
        <Circle
          position='absolute'
          size='10px'
          fontSize='12px'
          fontWeight='bold'
          bg='blue.500'
          color='white'
          top='-0.2em'
          right='-0.2em'
          opacity={hasPendingActions ? 1 : 0}
          transitionProperty='common'
          transitionDuration='normal'
        />
      </Box>
      <Drawer isOpen={isOpen} onClose={onClose} size='sm'>
        <DrawerOverlay backdropBlur='10px' />

        <DrawerContent minHeight='100vh' maxHeight='100vh' paddingTop='env(safe-area-inset-top)'>
          <DrawerCloseButton top='calc(18px + env(safe-area-inset-top))' />
          <DrawerHeader
            px={paddingProp}
            display='flex'
            alignItems='center'
            gap={2}
            justifyContent='space-between'
          >
            <Flex alignItems='center' gap={2}>
              <Icon as={TbBellFilled} color='text.subtle' />
              {translate('notificationCenter.title')}
            </Flex>
          </DrawerHeader>

          <Box pe={2}>
            <Box
              overflow='auto'
              height='calc(100vh - 70px - env(safe-area-inset-top))'
              className='scroll-container'
            >
              {actionsCards}
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
      <CancelLimitOrder
        orderToCancel={orderToCancel}
        resetOrderToCancel={handleResetOrderToCancel}
      />
    </>
  )
})
