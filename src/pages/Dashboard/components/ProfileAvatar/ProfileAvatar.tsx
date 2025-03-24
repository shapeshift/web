import { memo } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { useProfileAvatar } from '@/hooks/useProfileAvatar/useProfileAvatar'

const groupHoverHalfOpacity = { opacity: '0.5' }
const avatarSize = { base: 'lg', md: 'xl' }
const groupActive = { outline: '2px solid var(--chakra-colors-chakra-body-text)' }

export const ProfileAvatar = memo(() => {
  const walletImage = useProfileAvatar()
  return (
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
  )
})
