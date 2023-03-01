import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useState } from 'react'

type LazyLoadAvatarProps = AvatarProps
export const LazyLoadAvatar: React.FC<LazyLoadAvatarProps> = props => {
  const [imageLoaded, setImageLoaded] = useState(false)
  return (
    <SkeletonCircle isLoaded={imageLoaded}>
      <Avatar onLoad={() => (!imageLoaded ? setImageLoaded(true) : null)} {...props} />
    </SkeletonCircle>
  )
}
