import type { AvatarProps } from '@chakra-ui/react'
import { SwapperName } from '@shapeshiftoss/swapper'
import { useMemo } from 'react'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { assertUnreachable } from 'lib/utils'

import ZrxIcon from './0x-icon.png'
import ArbitrumBridgeIcon from './arbitrum-bridge-icon.png'
import CowIcon from './cow-icon.png'
import LiFiIcon from './lifi-icon.png'
import PortalsIcon from './portals-icon.png'
import THORChainIcon from './thorchain-icon.png'

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
      case SwapperName.Test:
        return ''
      default:
        assertUnreachable(swapperName)
    }
  }, [swapperName])

  return <LazyLoadAvatar size={size} src={icon} />
}
