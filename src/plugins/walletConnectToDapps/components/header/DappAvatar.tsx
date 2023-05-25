import { Box, Image, useColorModeValue } from '@chakra-ui/react'
import Placeholder from 'assets/placeholder.png'
import { CircleIcon } from 'components/Icons/Circle'

type DappAvatarProps = {
  image?: string
  name: string
  connected: boolean
  size?: number
  connectedDotSize?: number
  borderWidth?: number
}

export const DappAvatar: React.FC<DappAvatarProps> = ({
  image,
  name,
  connected,
  size = 8,
  connectedDotSize = 3,
  borderWidth = 2,
}) => {
  const connectedIconColor = useColorModeValue('green.500', 'green.200')
  const menuBg = useColorModeValue('gray.100', 'gray.700')

  return (
    <Box position='relative'>
      <Image boxSize={size} borderRadius='full' src={image || Placeholder} alt={name} />
      {connected && (
        <CircleIcon
          color={connectedIconColor}
          w={connectedDotSize}
          h={connectedDotSize}
          borderRadius='full'
          position='absolute'
          bottom={0}
          right={0}
          borderWidth={borderWidth}
          borderColor={menuBg}
        />
      )}
    </Box>
  )
}
