import { useMemo } from 'react'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'

import ZrxIcon from './0x-icon.png'
import OneInchIcon from './1inch-icon.png'
import CowIcon from './cow-icon.png'
import LiFiIcon from './lifi-icon.png'
import OsmosisIcon from './osmosis-icon.png'
import THORChainIcon from './thorchain-icon.png'

export const SwapperIcon = ({ swapperName }: { swapperName: SwapperName }) => {
  const icon = useMemo(() => {
    switch (swapperName) {
      case SwapperName.Osmosis:
        return OsmosisIcon
      case SwapperName.LIFI:
        return LiFiIcon
      case SwapperName.CowSwap:
        return CowIcon
      case SwapperName.Zrx:
        return ZrxIcon
      case SwapperName.Thorchain:
        return THORChainIcon
      case SwapperName.OneInch:
        return OneInchIcon
      case SwapperName.Test:
        return ''
      default:
        assertUnreachable(swapperName)
    }
  }, [swapperName])

  return <LazyLoadAvatar size='xs' src={icon} />
}
