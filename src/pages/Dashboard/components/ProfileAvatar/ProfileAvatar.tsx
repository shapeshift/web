import { Box, Button, Center, useDisclosure } from '@chakra-ui/react'
import { EditPen } from 'components/Icons/EditPen'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { useProfileAvatar } from 'hooks/useProfileAvatar/useProfileAvatar'

import { AvatarSelectModal } from './AvatarSelectModal'

const groupOverFullOpacity = { opacity: 1 }
const groupHoverHalfOpacity = { opacity: '0.5' }
const avatarSize = { base: 'lg', md: 'xl' }
const groupActive = { outline: '2px solid var(--chakra-colors-chakra-body-text)' }

export const ProfileAvatar = () => {
  const { isOpen, onClose, onOpen } = useDisclosure()
  const walletImage = useProfileAvatar()
  return (
    <Box>
      <Button
        onClick={onOpen}
        variant='unstyled'
        minHeight='auto'
        height='auto'
        role='group'
        position='relative'
      >
        <Center
          position='absolute'
          left='50%'
          top='50%'
          transform='translate(-50%, -50%)'
          boxSize='32px'
          borderRadius='full'
          borderWidth={2}
          borderColor='chakra-body-text'
          zIndex={2}
          opacity={0}
          transitionDuration='normal'
          transitionProperty='common'
          _groupHover={groupOverFullOpacity}
        >
          <EditPen className='editIcon' />
        </Center>
        <LazyLoadAvatar
          className='profile-avatar'
          borderRadius='xl'
          opacity='1'
          transitionDuration='normal'
          transitionProperty='common'
          size={avatarSize}
          src={walletImage}
          outline='2px solid transparent'
          _groupHover={groupHoverHalfOpacity}
          _groupActive={groupActive}
        />
      </Button>
      <AvatarSelectModal walletImage={walletImage} isOpen={isOpen} onClose={onClose} />
    </Box>
  )
}
