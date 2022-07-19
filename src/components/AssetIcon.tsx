import {
  Avatar,
  AvatarProps,
  Circle,
  useColorModeValue,
  useMultiStyleConfig,
} from '@chakra-ui/react'

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

type WrappedIconProps = {
  wrapColor?: string
  glow?: boolean
} & AssetIconProps

export const WrappedIcon: React.FC<WrappedIconProps> = ({ wrapColor, glow, ...rest }) => {
  const styles = useMultiStyleConfig('Avatar', rest)
  return (
    <Circle
      __css={styles.container}
      borderColor={wrapColor}
      borderWidth={2}
      bg='transparent'
      display='flex'
      alignItems='center'
      justifyContent='center'
    >
      <AssetIcon
        {...rest}
        width='80%'
        height='80%'
        boxShadow={glow ? `${wrapColor} 0 0 25px` : 'none'}
      />
    </Circle>
  )
}
