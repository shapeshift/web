import type { AvatarProps, SkeletonProps } from '@chakra-ui/react'
import { Avatar, SkeletonCircle } from '@chakra-ui/react'
import { useCallback, useState } from 'react'

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
        loading='lazy'
        onLoad={handleImageLoaded}
        src={src}
        size={size}
        icon={icon}
        boxSize={boxSize}
        name={name}
        borderRadius={borderRadius}
        bg={bg}
      />
    </SkeletonCircle>
  )
}
