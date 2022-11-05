import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Circle, useColorModeValue, useMultiStyleConfig } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { KeepKeyIcon } from './Icons/KeepKeyIcon'

type AssetIconProps = {
  assetId?: string
} & AvatarProps

// @TODO: this will be replaced with whatever we do for icons later

// The icon prop is used as the placeholder while the icon loads, or if it fails to load.

// Either src or assetId can be passed, if both are passed src takes precedence

type AssetWithNetworkProps = {
  assetId: AssetId
} & AvatarProps

const AssetWithNetwork: React.FC<AssetWithNetworkProps> = ({ assetId, icon, ...rest }) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const showFeeAsset = asset.assetId !== feeAsset.assetId
  const boxShadow = useColorModeValue(
    `0 0 0 0.2em ${feeAsset.color}35, 0 0 0.5em 2px rgba(255,255,255,.5)`,
    `0 0 0 0.2em ${feeAsset.color}50, 0 0 0.5em 2px rgba(0,0,0,.5)`,
  )
  return (
    <Avatar src={asset.icon} icon={icon} border={0} bg='none' {...rest}>
      {showFeeAsset && (
        <Avatar
          boxSize='0.85em'
          zIndex={2}
          position='absolute'
          right='-0.15em'
          top='-0.15em'
          border={0}
          bg='none'
          fontSize='inherit'
          src={feeAsset.icon}
          boxShadow={boxShadow}
        />
      )}
    </Avatar>
  )
}

export const AssetIcon = ({ assetId, src, ...rest }: AssetIconProps) => {
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('gray.500', 'gray.500')

  if (!assetId && !src) {
    return null
  }
  return assetId ? (
    <AssetWithNetwork
      assetId={assetId}
      icon={<KeepKeyIcon boxSize='16px' color={assetIconColor} />}
      {...rest}
    />
  ) : (
    <Avatar
      src={src}
      bg={assetIconBg}
      icon={<KeepKeyIcon boxSize='16px' color={assetIconColor} />}
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
