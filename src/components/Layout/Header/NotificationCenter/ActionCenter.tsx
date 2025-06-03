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
import { LimitOrderActionCard } from './components/LimitOrderActionCard'
import { SwapActionCard } from './components/SwapActionCard'

import {
  selectInitializedActionsByUpdatedAtDesc,
  selectWalletHasPendingActions,
} from '@/state/slices/actionSlice/selectors'
import { ActionType } from '@/state/slices/actionSlice/types'
import { swapSlice } from '@/state/slices/swapSlice/swapSlice'
import { useAppSelector } from '@/state/store'

const paddingProp = { base: 4, md: 6 }

const ActionCenterIcon = <Icon as={TbBellFilled} />

export const ActionCenter = memo(() => {
  const [isOpen, setIsOpen] = useState(false)
  const translate = useTranslate()
  const handleToggleIsOpen = useCallback(() => setIsOpen(previousIsOpen => !previousIsOpen), [])
  const handleClose = useCallback(() => setIsOpen(false), [])

  const actions = useAppSelector(selectInitializedActionsByUpdatedAtDesc)

  const hasPendingActions = useAppSelector(selectWalletHasPendingActions)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const actionsCards = useMemo(() => {
    return actions.map(action => {
      const actionsCards = (() => {
        switch (action.type) {
          case ActionType.Swap: {
            const swap = swapsById[action.swapMetadata.swapId]

            return (
              <SwapActionCard key={action.id} {...action}>
                <SwapDetails txLink={swap.txLink} />
              </SwapActionCard>
            )
          }
          case ActionType.LimitOrder: {
            return (
              <LimitOrderActionCard key={action.id} {...action}>
                <LimitOrderDetails
                  buyAsset={action.limitOrderMetadata.buyAsset}
                  sellAsset={action.limitOrderMetadata.sellAsset}
                  expires={action.limitOrderMetadata.expires}
                  buyAmountCryptoPrecision={action.limitOrderMetadata.buyAmountCryptoBaseUnit}
                  sellAmountCryptoPrecision={action.limitOrderMetadata.sellAmountCryptoBaseUnit}
                  limitPrice={action.limitOrderMetadata.limitPrice}
                  filledDecimalPercentage={action.limitOrderMetadata.filledDecimalPercentage}
                  executedBuyAmountCryptoBaseUnit={
                    action.limitOrderMetadata.executedBuyAmountCryptoBaseUnit
                  }
                  executedSellAmountCryptoBaseUnit={
                    action.limitOrderMetadata.executedSellAmountCryptoBaseUnit
                  }
                  status={action.status}
                />
              </LimitOrderActionCard>
            )
          }
          default:
            return null
        }
      })()

      return actionsCards
    })
  }, [actions, swapsById])

  return (
    <>
      <Box position='relative'>
        <IconButton
          aria-label={translate('navBar.pendingTransactions')}
          icon={ActionCenterIcon}
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
          opacity={hasPendingActions ? 1 : 0}
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
              {actionsCards}
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  )
})
