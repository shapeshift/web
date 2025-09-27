import type { AvatarProps, SkeletonProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

import { imageLongPressSx } from '@/constants/longPress'

export type LazyLoadAvatarProps = SkeletonProps &
  Pick<AvatarProps, 'src' | 'size' | 'boxSize' | 'name' | 'icon' | 'bg'>

export const LazyLoadAvatar: React.FC<LazyLoadAvatarProps> = ({
  src,
  size = 'sm',
  borderRadius,
  name,
  icon,
  boxSize,
  bg,
  ...rest
}) => {
  const [imageLoaded, setImageLoaded] = useState(src ? false : true)
  const [imageError, setImageError] = useState(false)
  const handleImageLoaded = useCallback(() => setImageLoaded(true), [])
  const handleImageError = useCallback(() => setImageError(true), [])

  return (
    <SkeletonCircle
      isLoaded={Boolean(imageLoaded || (imageError && name))}
      width='auto'
      height='auto'
      display='flex'
      borderRadius={borderRadius}
      {...rest}
    >
      <Avatar
        loading='lazy'
        onLoad={handleImageLoaded}
        onError={handleImageError}
        src={src}
        size={size}
        icon={icon}
        boxSize={boxSize}
        name={name}
        borderRadius={borderRadius}
        sx={imageLongPressSx}
        bg={bg}
      />
    </SkeletonCircle>
  )
}
