import { IconButton } from '@chakra-ui/react'
import { useCallback } from 'react'
import { TbSettings } from 'react-icons/tb'

import { useModal } from '@/hooks/useModal/useModal'

const settingsIcon = <TbSettings />
export const SettingsMenu = () => {
  const { open } = useModal('settings')
  const handleOpen = useCallback(() => {
    open({})
  }, [open])

  return (
    <IconButton
      aria-label='Settings'
      isRound
      variant='ghost'
      fontSize='lg'
      icon={settingsIcon}
      size='md'
      onClick={handleOpen}
    />
  )
}
