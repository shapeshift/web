import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Circle, useColorModeValue, useMultiStyleConfig } from '@chakra-ui/react'
import type { Asset } from '@keepkey/asset-service'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'
import { selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type AssetIconProps = {
  asset?: Asset
} & AvatarProps

type AssetWithNetworkProps = {
  asset: Asset
} & AvatarProps

const AssetWithNetwork: React.FC<AssetWithNetworkProps> = ({ asset, icon, ...rest }) => {
  const possibleFeeAsset = useAppSelector(
    !asset.assetId.startsWith('keepkey')
      ? state => selectFeeAssetById(state, asset.assetId)
      : () => undefined as unknown as Asset,
  )

  const feeAsset = asset?.assetId.startsWith('keepkey') ? asset : possibleFeeAsset

  const showFeeAsset = asset?.assetId !== feeAsset?.assetId
  const boxShadow = useColorModeValue(
    `0 0 0 0.2em ${feeAsset?.color}35, 0 0 0.5em 2px rgba(255,255,255,.5)`,
    `0 0 0 0.2em ${feeAsset?.color}50, 0 0 0.5em 2px rgba(0,0,0,.5)`,
  )
  return (
    <Avatar src={asset?.icon} icon={icon} border={0} bg='none' {...rest}>
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
          src={feeAsset?.icon}
          boxShadow={boxShadow}
        />
      )}
    </Avatar>
  )
}

export const AssetIcon = ({ asset, src, ...rest }: AssetIconProps) => {
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('gray.500', 'gray.500')

  if (!asset && !src) {
    return null
  }
  return asset ? (
    <AssetWithNetwork
      asset={asset}
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
