import { Image } from '@chakra-ui/react'

import ZrxIcon from './0x-icon.png'
import AcrossIcon from './across-icon.svg'
import ArbitrumBridgeIcon from './arbitrum-bridge-icon.png'
import AvnuIcon from './avnu-icon.jpg'
import BebopIcon from './bebop-icon.png'
import ButterSwapIcon from './butterswap.png'
import CetusIcon from './cetus-icon.jpg'
import ChainflipIcon from './chainflip-icon.png'
import CowIcon from './cow-icon.png'
import DebridgeIcon from './debridge-icon.svg'
import MayachainIcon from './maya_logo.png'
import NearIntentsIcon from './near-intents-icon.png'
import PortalsIcon from './portals-icon.png'
import RelayIcon from './relay-icon.svg'
import StonfiIcon from './stonfi-icon.png'
import SunioIcon from './sunio-icon.png'
import THORChainIcon from './thorchain-icon.png'

const icons: Record<string, string> = {
  THORChain: THORChainIcon,
  MAYAChain: MayachainIcon,
  'CoW Swap': CowIcon,
  '0x': ZrxIcon,
  'Arbitrum Bridge': ArbitrumBridgeIcon,
  Portals: PortalsIcon,
  Chainflip: ChainflipIcon,
  Relay: RelayIcon,
  ButterSwap: ButterSwapIcon,
  Bebop: BebopIcon,
  'NEAR Intents': NearIntentsIcon,
  Cetus: CetusIcon,
  'Sun.io': SunioIcon,
  AVNU: AvnuIcon,
  'STON.fi': StonfiIcon,
  Across: AcrossIcon,
  deBridge: DebridgeIcon,
}

interface SwapperIconProps {
  swapperName: string
  size?: string
}

export const SwapperIcon = ({
  swapperName,
  size = '20px',
}: SwapperIconProps): React.JSX.Element | null => {
  const src = icons[swapperName]

  if (!src) return null

  return (
    <Image
      src={src}
      alt={swapperName}
      boxSize={size}
      borderRadius='full'
      objectFit='cover'
      flexShrink={0}
    />
  )
}
