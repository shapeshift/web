import { Avatar, useColorModeValue } from '@chakra-ui/react'
import { CircleIcon } from 'components/Icons/Circle'
import { FoxIcon } from 'components/Icons/FoxIcon'

type DappAvatarProps = {
  image?: string
  connected: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '2xs' | 'xs' | 'full'
  connectedDotSize?: number
  borderWidth?: number
}

export const DappAvatar: React.FC<DappAvatarProps> = ({
  image,
  connected,
  size,
  connectedDotSize = 3,
  borderWidth = 2,
}) => {
  const connectedIconColor = useColorModeValue('green.500', 'green.200')
  const menuBg = useColorModeValue('gray.100', 'gray.700')

  return (
    <Avatar size={size} src={image} icon={<FoxIcon />}>
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
    </Avatar>
  )
}
