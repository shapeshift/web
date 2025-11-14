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
} from '@chakra-ui/react'
import { memo, useMemo, useState } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { Virtuoso } from 'react-virtuoso'

import { useActionCenterContext } from './ActionCenterContext'
import { AppUpdateActionCard } from './components/AppUpdateActionCard'
import { ArbitrumBridgeWithdrawActionCard } from './components/ArbitrumBridgeWithdrawActionCard'
import { EmptyState } from './components/EmptyState'
import { GenericTransactionActionCard } from './components/GenericTransactionActionCard'
import { LimitOrderActionCard } from './components/LimitOrderActionCard'
import { RewardDistributionActionCard } from './components/RewardDistributionActionCard'
import { RfoxClaimActionCard } from './components/RfoxClaimActionCard'
import { SwapActionCard } from './components/SwapActionCard'
import { TcyClaimActionCard } from './components/TcyClaimActionCard'

import { Display } from '@/components/Display'
import { RfoxInitiatedActionCard } from '@/components/Layout/Header/ActionCenter/components/RfoxInitiatedActionCard'
import { CancelLimitOrder } from '@/components/MultiHopTrade/components/LimitOrder/components/CancelLimitOrder'
import { useLimitOrders } from '@/components/MultiHopTrade/components/LimitOrder/hooks/useLimitOrders'
import type { OrderToCancel } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { useModalRegistration } from '@/context/ModalStackProvider'
import {
  selectWalletActionsSorted,
  selectWalletPendingActions,
} from '@/state/slices/actionSlice/selectors'
import { ActionType, GenericTransactionDisplayType } from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

const paddingProp = { base: 4, md: 6 }

const ActionCenterIcon = <Icon as={TbBellFilled} />

const virtuosoStyle = {
  height: '100%',
}

const INCREASE_VIEWPORT_BY = {
  top: 100,
  bottom: 100,
}

export const ActionCenter = memo(() => {
  'use no memo'
  const { isDrawerOpen, openActionCenter, closeDrawer } = useActionCenterContext()
  const { modalContentProps, overlayProps, modalProps } = useModalRegistration({
    isOpen: isDrawerOpen,
    onClose: closeDrawer,
  })

  const translate = useTranslate()
  const [orderToCancel, setOrderToCancel] = useState<OrderToCancel | undefined>(undefined)

  const actions = useAppSelector(selectWalletActionsSorted)

  const pendingActions = useAppSelector(selectWalletPendingActions)
  const { ordersByActionId } = useLimitOrders()
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const renderActionCard = useMemo(() => {
    return (index: number) => {
      const action = actions[index]
      if (!action) return null

      const actionsCards = (() => {
        switch (action.type) {
          case ActionType.Swap: {
            const swap = swapsById[action.swapMetadata.swapId]

            return (
              <SwapActionCard
                key={action.id}
                action={action}
                isCollapsable={Boolean(
                  swap?.txLink || action?.swapMetadata?.allowanceApproval?.txHash,
                )}
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
          case ActionType.AppUpdate: {
            return <AppUpdateActionCard key={action.id} action={action} />
          }
          case ActionType.Send:
          case ActionType.Deposit:
          case ActionType.Withdraw:
          case ActionType.ChangeAddress:
          case ActionType.Approve:
          case ActionType.Claim: {
            if (action.transactionMetadata.displayType === GenericTransactionDisplayType.RFOX) {
              return <RfoxInitiatedActionCard key={action.id} action={action} />
            }

            return <GenericTransactionActionCard key={action.id} action={action} />
          }
          case ActionType.RfoxClaim: {
            return <RfoxClaimActionCard key={action.id} action={action} />
          }
          case ActionType.TcyClaim: {
            return <TcyClaimActionCard key={action.id} action={action} />
          }
          case ActionType.RewardDistribution: {
            return <RewardDistributionActionCard key={action.id} action={action} />
          }
          case ActionType.ArbitrumBridgeWithdraw: {
            return <ArbitrumBridgeWithdrawActionCard key={action.id} action={action} />
          }
          default:
            return null
        }
      })()

      return actionsCards
    }
  }, [actions, ordersByActionId, swapsById, setOrderToCancel])

  const actionCenterButton = useMemo(() => {
    if (pendingActions.length) {
      return (
        <Button
          onClick={openActionCenter}
          aria-label={translate('actionCenter.pendingTransactions', {
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
          {translate('actionCenter.pendingTransactions', { count: pendingActions.length })}
        </Button>
      )
    }
    return (
      <Box position='relative'>
        <IconButton
          aria-label={translate('navBar.pendingTransactions')}
          icon={ActionCenterIcon}
          onClick={openActionCenter}
          variant='ghost'
        />
      </Box>
    )
  }, [openActionCenter, translate, pendingActions])

  const drawerContent = useMemo(() => {
    if (!actions.length) {
      return <EmptyState onClose={closeDrawer} />
    }

    return (
      <Virtuoso
        data={actions}
        itemContent={renderActionCard}
        style={virtuosoStyle}
        overscan={200}
        increaseViewportBy={INCREASE_VIEWPORT_BY}
        computeItemKey={(_, action) => action.id}
        className='scroll-container'
      />
    )
  }, [actions, renderActionCard, closeDrawer])

  return (
    <>
      <Display.Desktop>
        <Box position='relative'>{actionCenterButton}</Box>
        <Drawer size='sm' {...modalProps}>
          <DrawerOverlay backdropBlur='10px' {...overlayProps} />
          <DrawerContent
            minHeight='100vh'
            maxHeight='100vh'
            paddingTop='env(safe-area-inset-top)'
            {...modalContentProps}
          >
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
                {translate('actionCenter.title')}
              </Flex>
            </DrawerHeader>

            <Box pe={2} height='100%'>
              <Box height='calc(100vh - 70px - (env(safe-area-inset-top) - var(--safe-area-inset-top)))'>
                {drawerContent}
              </Box>
            </Box>
          </DrawerContent>
        </Drawer>
        <CancelLimitOrder orderToCancel={orderToCancel} onSetOrderToCancel={setOrderToCancel} />
      </Display.Desktop>
      <Display.Mobile>
        <Box pe={2}>
          <Box height='calc(100vh - 90px - var(--mobile-header-user-offset) - env(safe-area-inset-top) - var(--safe-area-inset-top) - var(--mobile-nav-offset))'>
            {drawerContent}
          </Box>
        </Box>
      </Display.Mobile>
    </>
  )
})
