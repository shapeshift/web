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
import { memo, useCallback, useState } from 'react'
import { TbBellFilled } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'

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
              Cards go here
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  )
})
