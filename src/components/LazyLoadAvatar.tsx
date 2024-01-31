import type { AvatarProps, SkeletonProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

export type LazyLoadAvatarProps = SkeletonProps & Pick<AvatarProps, 'src' | 'size'>

export const LazyLoadAvatar: React.FC<LazyLoadAvatarProps> = ({
  src,
  size = 'sm',
  borderRadius,
  ...rest
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const handleImageLoaded = useCallback(() => setImageLoaded(true), [])
  return (
    <SkeletonCircle
      isLoaded={imageLoaded}
      width='auto'
      height='auto'
      display='flex'
      borderRadius={borderRadius}
      {...rest}
    >
      <Avatar
        bg='transparent'
        loading='lazy'
        onLoad={handleImageLoaded}
        src={src}
        size={size}
        borderRadius={borderRadius}
      />
    </SkeletonCircle>
  )
}
