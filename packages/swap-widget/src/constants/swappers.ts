import { SwapperName } from '../types'

export const SWAPPER_ICONS: Partial<Record<SwapperName, string>> = {
  [SwapperName.Thorchain]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/thorchain-icon.png',
  [SwapperName.Mayachain]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/maya_logo.png',
  [SwapperName.CowSwap]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/cow-icon.png',
  [SwapperName.Zrx]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/0x-icon.png',
  [SwapperName.Portals]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/portals-icon.png',
  [SwapperName.Chainflip]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/chainflip-icon.png',
  [SwapperName.Relay]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/relay-icon.svg',
  [SwapperName.Bebop]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/bebop-icon.png',
  [SwapperName.Jupiter]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/jupiter-icon.svg',
  [SwapperName.ButterSwap]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/butterswap.png',
  [SwapperName.ArbitrumBridge]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/arbitrum-bridge-icon.png',
}

export const SWAPPER_COLORS: Partial<Record<SwapperName, string>> = {
  [SwapperName.Thorchain]: '#00CCFF',
  [SwapperName.Mayachain]: '#4169E1',
  [SwapperName.CowSwap]: '#012d73',
  [SwapperName.Zrx]: '#000000',
  [SwapperName.Portals]: '#8B5CF6',
  [SwapperName.Chainflip]: '#FF4081',
  [SwapperName.Relay]: '#6366F1',
  [SwapperName.Bebop]: '#E91E63',
  [SwapperName.Jupiter]: '#C4A962',
  [SwapperName.ButterSwap]: '#FFD700',
  [SwapperName.ArbitrumBridge]: '#28A0F0',
}

export const getSwapperIcon = (swapperName: SwapperName): string | undefined => {
  return SWAPPER_ICONS[swapperName]
}

export const getSwapperColor = (swapperName: SwapperName): string => {
  return SWAPPER_COLORS[swapperName] ?? '#6366F1'
}
