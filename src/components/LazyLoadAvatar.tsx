import type { AvatarProps, SkeletonProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useState } from 'react'

import { imageLongPressSx } from '@/constants/longPress'

const loadedSrcs = new Set<string>()

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
  const [loadedSrc, setLoadedSrc] = useState<string>()
  const [failedSrc, setFailedSrc] = useState<string>()
  const isKnownLoaded = Boolean(src && loadedSrcs.has(src)) && failedSrc !== src

  const handleImageLoaded = () => {
    if (!src) return
    loadedSrcs.add(src)
    setLoadedSrc(src)
  }
  const handleImageError = () => {
    if (src) loadedSrcs.delete(src)
    setFailedSrc(src)
  }

  return (
    <SkeletonCircle
      isLoaded={!src || isKnownLoaded || loadedSrc === src || (failedSrc === src && Boolean(name))}
      width='auto'
      height='auto'
      display='flex'
      borderRadius={borderRadius}
      {...rest}
    >
      <Avatar
        loading='lazy'
        ignoreFallback={isKnownLoaded}
        onLoad={handleImageLoaded}
        onError={handleImageError}
        onErrorCapture={handleImageError}
        src={src}
        size={size}
        icon={icon}
        boxSize={boxSize}
        name={name}
        borderRadius={borderRadius}
        sx={imageLongPressSx}
        bg={bg ?? (isKnownLoaded ? 'transparent' : undefined)}
      />
    </SkeletonCircle>
  )
}
