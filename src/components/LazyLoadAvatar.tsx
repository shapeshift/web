import type { AvatarProps, SkeletonProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'

import type { AvatarSize } from '@/components/Avatar/Avatar.theme'
import { AVATAR_SIZES } from '@/components/Avatar/Avatar.theme'
import { imageLongPressSx } from '@/constants/longPress'

export type LazyLoadAvatarProps = SkeletonProps &
  Pick<AvatarProps, 'src' | 'boxSize' | 'name' | 'icon' | 'bg' | 'size'>

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

  const skeletonSize = useMemo(() => {
    if (boxSize !== undefined) {
      return typeof boxSize === 'number' ? `${boxSize}px` : (boxSize as string)
    }
    return AVATAR_SIZES[size as AvatarSize] ?? AVATAR_SIZES.md
  }, [boxSize, size])

  return (
    <SkeletonCircle
      isLoaded={Boolean(imageLoaded || (imageError && name))}
      size={skeletonSize}
      borderRadius={borderRadius}
      {...rest}
    >
      <Avatar
        loading='lazy'
        onLoad={handleImageLoaded}
        onError={handleImageError}
        src={src}
        icon={icon}
        boxSize='100%'
        name={name}
        borderRadius={borderRadius}
        sx={imageLongPressSx}
        bg={bg}
      />
    </SkeletonCircle>
  )
}
