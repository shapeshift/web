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
import { ethAssetId, foxAssetId, usdcAssetId } from '@shapeshiftoss/caip'
import { memo, useCallback, useState } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

import { ClaimDetails } from './components/Details/ClaimDetails'
import { GenericTransactionDetails } from './components/Details/GenericTransactionDetails'
import { LimitOrderDetails } from './components/Details/LimitOrderDetails'
import { SwapDetails } from './components/Details/SwapDetails'
import { NotificationCard } from './components/NotificationCard'
import { NotificationStatus, NotificationType } from './types'

const paddingProp = { base: 4, md: 6 }

const NotificationCenterIcon = <Icon as={TbBellFilled} />

export const NotificationCenter = memo(() => {
  const [isOpen, setIsOpen] = useState(false)
  const translate = useTranslate()
  const handleToggleIsOpen = useCallback(() => setIsOpen(previousIsOpen => !previousIsOpen), [])
  const handleClose = useCallback(() => setIsOpen(false), [])
  const hasPendingTxs = true
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
          opacity={hasPendingTxs ? 1 : 0}
          transitionProperty='common'
          transitionDuration='normal'
        />
      </Box>
      <Drawer isOpen={isOpen} onClose={handleClose} size='sm'>
        <DrawerOverlay backdropBlur='10px' />

        <DrawerContent
          minHeight='100vh'
          maxHeight='100vh'
          paddingTop='calc(env(safe-area-inset-top) + var(--safe-area-inset-top))'
        >
          <DrawerCloseButton top='calc(18px + env(safe-area-inset-top) + var(--safe-area-inset-top))' />
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
              height='calc(100vh - 70px - env(safe-area-inset-top) - var(--safe-area-inset-top))'
              className='scroll-container'
            >
              <NotificationCard
                type={NotificationType.Limit}
                assetId={usdcAssetId}
                secondaryAssetId={ethAssetId}
                status={NotificationStatus.Expired}
                date={new Date('2025-04-29').getTime() / 1000}
                title='Limit Order Placed for 1 ETH to USDC'
              >
                <LimitOrderDetails />
              </NotificationCard>
              <NotificationCard
                type={NotificationType.Swap}
                assetId={usdcAssetId}
                secondaryAssetId={ethAssetId}
                status={NotificationStatus.Complete}
                date={new Date('2025-04-29').getTime() / 1000}
                title='Swap 0.00 USDC to 0.00 ETH'
              >
                <SwapDetails isStreaming />
              </NotificationCard>
              <NotificationCard
                type={NotificationType.Deposit}
                assetId={ethAssetId}
                secondaryAssetId={foxAssetId}
                status={NotificationStatus.Pending}
                date={new Date('2025-04-29').getTime() / 1000}
                title='Your deposit of 0.00 WETH/FOX to 0x1234 is being processed'
              >
                <GenericTransactionDetails />
              </NotificationCard>
              <NotificationCard
                type={NotificationType.Deposit}
                assetId={ethAssetId}
                secondaryAssetId={foxAssetId}
                status={NotificationStatus.Failed}
                date={new Date('2025-04-29').getTime() / 1000}
                title='Your deposit of 0.00 WETH/FOX to 0x1234 has failed'
              >
                <GenericTransactionDetails />
              </NotificationCard>
              <NotificationCard
                type={NotificationType.Claim}
                assetId={foxAssetId}
                status={NotificationStatus.ClaimAvailable}
                date={new Date('2025-04-29').getTime() / 1000}
                title='Your unstake of 0.00 FOX is ready to claim'
              >
                <ClaimDetails />
              </NotificationCard>
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  )
})
