import { SwapperName } from '../types'

export const SWAPPER_ICONS: Partial<Record<SwapperName, string>> = {
  [SwapperName.ArbitrumBridge]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/arbitrum-bridge-icon.png',
  [SwapperName.Bebop]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/bebop-icon.png',
  [SwapperName.ButterSwap]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/butterswap.png',
  [SwapperName.Chainflip]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/chainflip-icon.png',
  [SwapperName.CowSwap]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/cow-icon.png',
  [SwapperName.Mayachain]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/maya_logo.png',
  [SwapperName.NearIntents]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/near-intents-icon.png',
  [SwapperName.Portals]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/portals-icon.png',
  [SwapperName.Relay]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/relay-icon.svg',
  [SwapperName.Thorchain]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/thorchain-icon.png',
  [SwapperName.Zrx]:
    'https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/0x-icon.png',
}

export const SWAPPER_COLORS: Partial<Record<SwapperName, string>> = {
  [SwapperName.ArbitrumBridge]: '#28A0F0',
  [SwapperName.Bebop]: '#E91E63',
  [SwapperName.ButterSwap]: '#FFD700',
  [SwapperName.Chainflip]: '#FF4081',
  [SwapperName.CowSwap]: '#012d73',
  [SwapperName.Mayachain]: '#4169E1',
  [SwapperName.NearIntents]: '#000000',
  [SwapperName.Portals]: '#8B5CF6',
  [SwapperName.Relay]: '#6366F1',
  [SwapperName.Thorchain]: '#00CCFF',
  [SwapperName.Zrx]: '#000000',
}

export const getSwapperIcon = (swapperName: SwapperName): string | undefined => {
  return SWAPPER_ICONS[swapperName]
}

export const getSwapperColor = (swapperName: SwapperName): string => {
  return SWAPPER_COLORS[swapperName] ?? '#6366F1'
}
