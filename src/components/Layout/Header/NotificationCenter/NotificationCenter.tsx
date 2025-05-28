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
} from '@chakra-ui/react'
import { memo, useCallback, useMemo, useState } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { LimitOrderDetails } from './components/Details/LimitOrderDetails'
import { SwapDetails } from './components/Details/SwapDetails'
import { NotificationCard } from './components/NotificationCard'

import {
  selectInitializedActionsByUpdatedAtDescFilteredByWallet,
  selectPendingActionsFilteredByWallet,
} from '@/state/slices/actionSlice/selectors'
import {
  ActionCenterType,
  isLimitOrderPayloadDiscriminator,
  isTradePayloadDiscriminator,
} from '@/state/slices/actionSlice/types'
import { selectSwapById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const paddingProp = { base: 4, md: 6 }

const NotificationCenterIcon = <Icon as={TbBellFilled} />

export const NotificationCenter = memo(() => {
  const [isOpen, setIsOpen] = useState(false)
  const translate = useTranslate()
  const handleToggleIsOpen = useCallback(() => setIsOpen(previousIsOpen => !previousIsOpen), [])
  const handleClose = useCallback(() => setIsOpen(false), [])

  const actions = useAppSelector(selectInitializedActionsByUpdatedAtDescFilteredByWallet)

  const pendingActions = useAppSelector(selectPendingActionsFilteredByWallet)
  const swapById = useAppSelector(selectSwapById)

  const notificationsCards = useMemo(() => {
    return actions.map(action => {
      const notificationCardDetails = (() => {
        switch (action.type) {
          case ActionCenterType.Swap: {
            if (!isTradePayloadDiscriminator(action)) return

            const swap = swapById[action.metadata.swapId]

            return <SwapDetails txLink={swap.txLink} />
          }
          case ActionCenterType.LimitOrder:
            if (!isLimitOrderPayloadDiscriminator(action)) return

            return (
              <LimitOrderDetails
                buyAsset={action.metadata.buyAsset}
                sellAsset={action.metadata.sellAsset}
                expires={action.metadata.expires}
                buyAmountCryptoPrecision={action.metadata.buyAmountCryptoBaseUnit}
                sellAmountCryptoPrecision={action.metadata.sellAmountCryptoBaseUnit}
                limitPrice={action.metadata.limitPrice}
                filledDecimalPercentage={action.metadata.filledDecimalPercentage}
                executedBuyAmountCryptoBaseUnit={action.metadata.executedBuyAmountCryptoBaseUnit}
                executedSellAmountCryptoBaseUnit={action.metadata.executedSellAmountCryptoBaseUnit}
                status={action.status}
              />
            )
          default:
            return null
        }
      })()

      return (
        <NotificationCard key={action.id} {...action}>
          {notificationCardDetails}
        </NotificationCard>
      )
    })
  }, [actions, swapById])

  return (
    <>
      <Box position='relative'>
        <IconButton
          aria-label={translate('navBar.pendingTransactions')}
          icon={NotificationCenterIcon}
          onClick={handleToggleIsOpen}
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
          opacity={pendingActions.length ? 1 : 0}
          transitionProperty='common'
          transitionDuration='normal'
        />
      </Box>
      <Drawer isOpen={isOpen} onClose={handleClose} size='sm'>
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
              {notificationsCards}
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  )
})
