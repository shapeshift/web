import type { AvatarProps } from '@chakra-ui/react'
import { Box } from '@chakra-ui/react'
import type { FC } from 'react'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'

const maskStyle = {
  maskImage: 'linear-gradient(to bottom left, transparent 40%, black 60%)',
  WebkitMaskImage: 'linear-gradient(to bottom left, transparent 40%, black 60%)',
}

export type CombinedIconProps = {
  icons: string[]
  size?: AvatarProps['size']
  boxSize?: AvatarProps['boxSize']
}

export const CombinedIcon: FC<CombinedIconProps> = ({ icons, size, boxSize }) => {
  return (
    <Box position='relative' display='inline-block'>
      <LazyLoadAvatar src={icons[0]} size={size} boxSize={boxSize} />
      <Box position='absolute' left={0} top={0} width='100%' height='100%' style={maskStyle}>
        <LazyLoadAvatar src={icons[1]} size={size} boxSize={boxSize} />
      </Box>
    </Box>
  )
}
