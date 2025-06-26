import {
  Box,
  Button,
  CircularProgress,
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
import { memo, useMemo, useState } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { EmptyState } from './components/EmptyState'
import { LimitOrderActionCard } from './components/LimitOrderActionCard'
import { SwapActionCard } from './components/SwapActionCard'

import { CancelLimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/components/CancelLimitOrder'
import { useLimitOrders } from '@/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { useLimitOrderActionSubscriber } from '@/hooks/useActionCenterSubscriber/useLimitOrderActionSubscriber'
import { useSwapActionSubscriber } from '@/hooks/useActionCenterSubscriber/useSwapActionSubscriber'
import {
  selectWalletActionsSorted,
  selectWalletPendingActions,
} from '@/state/slices/actionSlice/selectors'
import { ActionType } from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

const paddingProp = { base: 4, md: 6 }

const ActionCenterIcon = <Icon as={TbBellFilled} />

export const ActionCenter = memo(() => {
  const { isOpen, onOpen, onClose } = useDisclosure()

  useSwapActionSubscriber({ onDrawerOpen: onOpen, isDrawerOpen: isOpen })
  useLimitOrderActionSubscriber({ onDrawerOpen: onOpen, isDrawerOpen: isOpen })

  const translate = useTranslate()
  const [orderToCancel, setOrderToCancel] = useState<OrderToCancel | undefined>(undefined)

  const actions = useAppSelector(selectWalletActionsSorted)

  const pendingActions = useAppSelector(selectWalletPendingActions)
  const { ordersByActionId } = useLimitOrders()
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const maybeActionCards = useMemo(() => {
    return actions.map(action => {
      const actionsCards = (() => {
        switch (action.type) {
          case ActionType.Swap: {
            const swap = swapsById[action.swapMetadata.swapId]

            return (
              <SwapActionCard
                key={action.id}
                action={action}
                isCollapsable={Boolean(swap?.txLink)}
              />
            )
          }
          case ActionType.LimitOrder: {
            const order = ordersByActionId[action.id]

            if (!order) return null

            return (
              <LimitOrderActionCard
                key={action.id}
                order={order}
                action={action}
                onCancelOrder={setOrderToCancel}
              />
            )
          }
          default:
            return null
        }
      })()

      return actionsCards
    })
  }, [actions, ordersByActionId, swapsById])

  const actionCardsOrEmpty = useMemo(() => {
    if (!maybeActionCards.length) return <EmptyState onClose={onClose} />

    return maybeActionCards
  }, [maybeActionCards])

  const actionCenterButton = useMemo(() => {
    if (pendingActions.length) {
      return (
        <Button
          onClick={onOpen}
          aria-label={translate('notificationCenter.pendingTransactions', {
            count: pendingActions.length,
          })}
        >
          <CircularProgress
            size='16px'
            thickness='16px'
            trackColor='whiteAlpha.700'
            color='blue.500'
            isIndeterminate
            me={2}
          />
          {translate('notificationCenter.pendingTransactions', { count: pendingActions.length })}
        </Button>
      )
    }
    return (
      <Box position='relative'>
        <IconButton
          aria-label={translate('navBar.pendingTransactions')}
          icon={ActionCenterIcon}
          onClick={onOpen}
        />
      </Box>
    )
  }, [onOpen, translate, pendingActions])

  return (
    <>
      <Box position='relative'>{actionCenterButton}</Box>
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
              {actionCardsOrEmpty}
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
      <CancelLimitOrder orderToCancel={orderToCancel} onSetOrderToCancel={setOrderToCancel} />
    </>
  )
})
