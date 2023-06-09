import { Box, Button, Center, useDisclosure } from '@chakra-ui/react'
import { useMemo } from 'react'
import { EditPen } from 'components/Icons/EditPen'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { makeBlockiesUrl } from 'lib/blockies/makeBlockiesUrl'
import { selectSelectedNftAvatarUrl } from 'state/apis/nft/selectors'
import { selectWalletId } from 'state/slices/common-selectors'
import { useAppSelector } from 'state/store'

import { AvatarSelectModal } from './AvatarSelectModal'

export const ProfileAvatar = () => {
  const walletId = useAppSelector(selectWalletId)
  const selectedNftAvatarUrl = useAppSelector(selectSelectedNftAvatarUrl)
  const { isOpen, onClose, onOpen } = useDisclosure()
  const walletImage = useMemo(() => {
    if (!walletId) return ''
    if (selectedNftAvatarUrl) return selectedNftAvatarUrl
    /* This needs to be a min of 15 characters so we added a string to ensure its always at least 15 */
    return makeBlockiesUrl(`${walletId}ifyoudriveatruckdriveitlikeyouhaveafarm`)
  }, [selectedNftAvatarUrl, walletId])
  if (!walletId) return null
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
          _groupHover={{ opacity: 1 }}
        >
          <EditPen className='editIcon' />
        </Center>
        <LazyLoadAvatar
          className='profile-avatar'
          borderRadius='xl'
          opacity='1'
          transitionDuration='normal'
          transitionProperty='common'
          size={{ base: 'md', md: 'xl' }}
          src={walletImage}
          outline='2px solid transparent'
          _groupHover={{ opacity: '0.5' }}
          _groupActive={{ outline: '2px solid var(--chakra-colors-chakra-body-text)' }}
        />
      </Button>
      <AvatarSelectModal walletImage={walletImage} isOpen={isOpen} onClose={onClose} />
    </Box>
  )
}
