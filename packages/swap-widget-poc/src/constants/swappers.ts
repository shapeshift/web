import type { SwapperName } from "../types";

export const SWAPPER_ICONS: Record<SwapperName, string> = {
  THORChain:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/thorchain-icon.png",
  MAYAChain:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/maya_logo.png",
  "CoW Swap":
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/cow-icon.png",
  "0x": "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/0x-icon.png",
  Portals:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/portals-icon.png",
  Chainflip:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/chainflip-icon.png",
  Relay:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/relay-icon.svg",
  Bebop:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/bebop-icon.png",
  Jupiter:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/jupiter-icon.svg",
  "1inch":
    "https://raw.githubusercontent.com/trustwallet/assets/master/dapps/1inch.exchange.png",
  ButterSwap:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/butterswap.png",
  ArbitrumBridge:
    "https://raw.githubusercontent.com/shapeshift/web/develop/src/components/MultiHopTrade/components/TradeInput/components/SwapperIcon/arbitrum-bridge-icon.png",
};

export const SWAPPER_COLORS: Partial<Record<SwapperName, string>> = {
  THORChain: "#00CCFF",
  MAYAChain: "#4169E1",
  "CoW Swap": "#012d73",
  "0x": "#000000",
  Portals: "#8B5CF6",
  Chainflip: "#FF4081",
  Relay: "#6366F1",
  Bebop: "#E91E63",
  Jupiter: "#C4A962",
  "1inch": "#1B314F",
  ButterSwap: "#FFD700",
  ArbitrumBridge: "#28A0F0",
};

export const getSwapperIcon = (
  swapperName: SwapperName,
): string | undefined => {
  return SWAPPER_ICONS[swapperName];
};

export const getSwapperColor = (swapperName: SwapperName): string => {
  return SWAPPER_COLORS[swapperName] ?? "#6366F1";
};
