import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Circle, useColorModeValue, useMultiStyleConfig } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/asset-service'
import type { AssetId } from '@shapeshiftoss/caip'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxIcon } from './Icons/FoxIcon'

type AssetIconProps = {
  asset?: Asset
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
  const showNetwork = feeAsset?.networkIcon || asset?.assetId !== feeAsset?.assetId
  const boxShadow = useColorModeValue(
    `0 0 0 0.2em ${feeAsset?.color ?? 'black'}35, 0 0 0.5em 2px rgba(255,255,255,.5)`,
    `0 0 0 0.2em ${feeAsset?.color ?? 'white'}50, 0 0 0.5em 2px rgba(0,0,0,.5)`,
  )
  return (
    <Avatar src={asset?.icon} icon={icon} border={0} bg='none' {...rest}>
      {showNetwork && (
        <Avatar
          boxSize='0.85em'
          zIndex={2}
          position='absolute'
          right='-0.15em'
          top='-0.15em'
          border={0}
          bg='none'
          fontSize='inherit'
          src={feeAsset?.networkIcon ?? feeAsset?.icon}
          boxShadow={boxShadow}
        />
      )}
    </Avatar>
  )
}

export const AssetIcon = ({ asset, assetId, src, ...rest }: AssetIconProps) => {
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('gray.500', 'gray.500')

  if (!asset && !assetId && !src) return null

  if (assetId) {
    return (
      <AssetWithNetwork
        assetId={assetId}
        icon={<FoxIcon boxSize='16px' color={assetIconColor} />}
        {...rest}
      />
    )
  }

  if (asset) {
    return (
      <Avatar
        src={asset?.networkIcon ?? asset?.icon}
        bg={assetIconBg}
        icon={<FoxIcon boxSize='16px' color={assetIconColor} />}
        {...rest}
      />
    )
  }

  return (
    <Avatar
      src={src}
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
