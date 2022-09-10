import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Circle, useColorModeValue, useMultiStyleConfig } from '@chakra-ui/react'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxIcon } from './Icons/FoxIcon'

type AssetIconProps = {
  assetId?: string
} & AvatarProps

// @TODO: this will be replaced with whatever we do for icons later

// The icon prop is used as the placeholder while the icon loads, or if it fails to load.

// Either src or assetId can be passed, if both are passed src takes precedence
export const AssetIcon = ({ assetId, src, ...rest }: AssetIconProps) => {
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('gray.500', 'gray.500')
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  if (!assetId && !src) {
    return null
  }
  const imgSrc = src ?? asset?.icon
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
