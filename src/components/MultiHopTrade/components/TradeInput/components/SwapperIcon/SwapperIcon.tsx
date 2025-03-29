import type { AvatarProps } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'

import ZrxIcon from './0x-icon.png'
import ArbitrumBridgeIcon from './arbitrum-bridge-icon.png'
import ChainflipIcon from './chainflip-icon.png'
import CowIcon from './cow-icon.png'
import JupiterIcon from './jupiter-icon.svg'
import LiFiIcon from './lifi-icon.png'
import PortalsIcon from './portals-icon.png'
import RelayIcon from './relay-icon.svg'
import THORChainIcon from './thorchain-icon.png'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { assertUnreachable } from '@/lib/utils'

export const SwapperIcon = ({
  swapperName,
  size = 'xs',
}: {
  swapperName: SwapperName
  size?: AvatarProps['size']
}) => {
  const icon = useMemo(() => {
    switch (swapperName) {
      case SwapperName.LIFI:
        return LiFiIcon
      case SwapperName.CowSwap:
        return CowIcon
      case SwapperName.Zrx:
        return ZrxIcon
      case SwapperName.Thorchain:
        return THORChainIcon
      case SwapperName.ArbitrumBridge:
        return ArbitrumBridgeIcon
      case SwapperName.Portals:
        return PortalsIcon
      case SwapperName.Chainflip:
        return ChainflipIcon
      case SwapperName.Jupiter:
        return JupiterIcon
      case SwapperName.Relay:
        return RelayIcon
      default:
        assertUnreachable(swapperName)
    }
  }, [swapperName])

  return <LazyLoadAvatar size={size} src={icon} />
}
