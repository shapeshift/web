import type { AvatarProps, SkeletonProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useState } from 'react'

export type LazyLoadAvatarProps = SkeletonProps & Pick<AvatarProps, 'src' | 'size'>

const emptyJsx = <></>

export const LazyLoadAvatar: React.FC<LazyLoadAvatarProps> = ({
  src,
  size = 'sm',
  borderRadius,
  ...rest
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  return (
    <SkeletonCircle
      isLoaded={imageLoaded}
      width='auto'
      height='auto'
      borderRadius={borderRadius}
      {...rest}
    >
      <Avatar
        bg='transparent'
        loading='lazy'
        onLoad={() => setImageLoaded(true)}
        src={src}
        size={size}
        icon={emptyJsx}
        borderRadius={borderRadius}
      />
    </SkeletonCircle>
  )
}
