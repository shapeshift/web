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
import { memo, useMemo } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { SwapDetails } from './components/Details/SwapDetails'
import { SwapActionCard } from './components/SwapActionCard'

import { useSwapActionSubscriber } from '@/hooks/useActionCenterSubscriber/useSwapActionSubscriber'
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
  const { isOpen, onOpen, onClose } = useDisclosure()

  useSwapActionSubscriber({ onDrawerOpen: onOpen })

  const translate = useTranslate()

  const actions = useAppSelector(selectInitializedActionsByUpdatedAtDesc)

  const hasPendingActions = useAppSelector(selectWalletHasPendingActions)
  const swapsById = useAppSelector(swapSlice.selectors.selectSwapsById)

  const notificationsCards = useMemo(() => {
    return actions.map(action => {
      const swapActionCardDetails = (() => {
        switch (action.type) {
          case ActionType.Swap: {
            const swap = swapsById[action.swapMetadata.swapId]

            return <SwapDetails txLink={swap.txLink} />
          }
          default:
            return null
        }
      })()

      return (
        <SwapActionCard key={action.id} {...action}>
          {swapActionCardDetails}
        </SwapActionCard>
      )
    })
  }, [actions, swapsById])

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
              {notificationsCards}
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  )
})
