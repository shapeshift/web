import { Avatar, AvatarProps, useColorModeValue } from '@chakra-ui/react'

import { FoxIcon } from './Icons/FoxIcon'

type AssetIconProps = {
  symbol?: string
} & AvatarProps

// @TODO: this will be replaced with whatever we do for icons later

// The icon prop is used as the placeholder while the icon loads, or if it fails to load.

// Either src or symbol can be passed, if both are passed src takes precedence
export const AssetIcon = ({ symbol, src, ...rest }: AssetIconProps) => {
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('gray.500', 'gray.500')

  if (!src && !symbol) {
    return null
  }
  const imgSrc = src ? src : `https://static.coincap.io/assets/icons/256/${symbol}.png`
  return (
    <Avatar
      src={imgSrc}
      bg={assetIconBg}
      icon={<FoxIcon boxSize='16px' color={assetIconColor} />}
      {...rest}
    />
  )
}
