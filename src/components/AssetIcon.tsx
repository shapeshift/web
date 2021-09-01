import { Avatar, AvatarProps, useColorModeValue } from '@chakra-ui/react'

import { FoxIcon } from './Icons/FoxIcon'

type AssetIconProps = {
  symbol?: string
} & AvatarProps

// @TODO: this will be replaced with whatever we do for icons later

// The icon here is as the placeholder while the icon loads, or if it fails to load.

export const AssetIcon = ({ symbol, ...rest }: AssetIconProps) => {
  return (
    <Avatar
      src={`https://static.coincap.io/assets/icons/256/${symbol}.png`}
      bg={useColorModeValue('gray.200', 'gray.700')}
      icon={<FoxIcon boxSize='16px' color={useColorModeValue('gray.500', 'gray.500')} />}
      {...rest}
    />
  )
}
