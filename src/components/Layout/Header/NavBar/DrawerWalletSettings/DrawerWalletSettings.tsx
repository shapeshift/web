import { Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useRef } from 'react'

import { DrawerSettingsRouter } from './DrawerSettingsRouter'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'

type DrawerWalletSettingsProps = {
  onBack: () => void
  onClose?: () => void
}

export const DrawerWalletSettings: FC<DrawerWalletSettingsProps> = ({ onBack, onClose }) => {
  const backHandlerRef = useRef<(() => void) | null>(null)

  const handleSetBackHandler = useCallback((handler: () => void) => {
    backHandlerRef.current = handler
  }, [])

  const handleBackClick = useCallback(() => {
    if (backHandlerRef.current) {
      backHandlerRef.current()
    }
  }, [])

  return (
    <Box display='flex' flexDirection='column' height='100%'>
      <DialogHeader>
        <DialogHeader.Left>
          <DialogBackButton onClick={handleBackClick} />
        </DialogHeader.Left>
        <DialogHeader.Middle>
          <Text translation='modals.settings.settings' fontWeight='medium' />
        </DialogHeader.Middle>
        <DialogHeader.Right>{/* Empty right section */}</DialogHeader.Right>
      </DialogHeader>
      <Box flex='1' overflow='auto' maxHeight={'100%'} className='scroll-container'>
        <DrawerSettingsRouter
          onBack={onBack}
          onClose={onClose}
          onBackClick={handleSetBackHandler}
        />
      </Box>
    </Box>
  )
}
