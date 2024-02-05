import type { AvatarProps } from '@chakra-ui/react'
import { Avatar, Flex, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId } from '@shapeshiftoss/caip'
import { memo, useMemo } from 'react'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectAssetById, selectFeeAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FoxIcon } from './Icons/FoxIcon'

type AssetIconProps = {
  assetId?: string
  // Show the network icon instead of the asset icon e.g OP icon instead of ETH for Optimism native asset
  showNetworkIcon?: boolean
} & AvatarProps

// @TODO: this will be replaced with whatever we do for icons later

// The icon prop is used as the placeholder while the icon loads, or if it fails to load.

// Either src or assetId can be passed, if both are passed src takes precedence

type AssetWithNetworkProps = {
  assetId: AssetId
  showNetworkIcon?: boolean
} & AvatarProps

const before = {
  content: '""',
  width: '115%',
  height: '115%',
  backgroundColor: 'var(--chakra-colors-chakra-body-bg)',
  borderRadius: 'full',
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: -1,
}

const AssetWithNetwork: React.FC<AssetWithNetworkProps> = ({
  assetId,
  icon,
  src,
  showNetworkIcon = true,
  ...rest
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId))
  const showNetwork = feeAsset?.networkIcon || asset?.assetId !== feeAsset?.assetId
  const iconSrc = src ?? asset?.icon

  return (
    <Avatar src={iconSrc} icon={icon} border={0} {...rest}>
      {showNetwork && showNetworkIcon && (
        <Avatar
          boxSize='50%'
          zIndex={2}
          position='absolute'
          right={0}
          bottom='0'
          border={0}
          icon={icon}
          fontSize='inherit'
          src={feeAsset?.networkIcon ?? feeAsset?.icon}
          _before={before}
        />
      )}
    </Avatar>
  )
}

export const AssetIcon = memo(({ assetId, showNetworkIcon, src, ...rest }: AssetIconProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const assetIconBg = useColorModeValue('gray.200', 'gray.700')
  const assetIconColor = useColorModeValue('text.subtle', 'text.subtle')

  const chainAdapterManager = getChainAdapterManager()
  const chainId = assetId && fromAssetId(assetId).chainId
  const nativeAssetId = chainAdapterManager.get(chainId ?? '')?.getFeeAssetId()
  const foxIcon = useMemo(() => <FoxIcon boxSize='16px' color={assetIconColor} />, [assetIconColor])

  if (assetId === nativeAssetId && asset?.networkIcon && showNetworkIcon) {
    return <Avatar src={asset.networkIcon} bg={assetIconBg} icon={foxIcon} {...rest} />
  }

  if (assetId) {
    if (asset?.icons) {
      return (
        <Flex flexDirection='row' alignItems='center'>
          {asset.icons.map((iconSrc, i) => (
            <Avatar key={i} src={iconSrc} ml={i === 0 ? '0' : '-2.5'} icon={foxIcon} {...rest} />
          ))}
        </Flex>
      )
    }

    return (
      <AssetWithNetwork
        assetId={assetId}
        src={src}
        icon={foxIcon}
        showNetworkIcon={showNetworkIcon}
        {...rest}
      />
    )
  }

  return <Avatar src={src} bg={assetIconBg} icon={foxIcon} {...rest} />
})
