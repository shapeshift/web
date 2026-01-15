import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import type { WagmiProviderProps } from "wagmi";
import {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet,
  monad,
  optimism,
  plasma,
  polygon,
} from "wagmi/chains";

export const SUPPORTED_CHAINS = [
  mainnet,
  polygon,
  arbitrum,
  arbitrumNova,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
  monad,
  hyperEvm,
  plasma,
  katana,
] as const;

export type SupportedChains = typeof SUPPORTED_CHAINS;
export type SupportedChainId = SupportedChains[number]["id"];

export type WagmiConfig = WagmiProviderProps["config"];

export const createWagmiConfig = (
  projectId: string,
  appName: string = "ShapeShift Swap Widget",
): WagmiConfig =>
  getDefaultConfig({
    appName,
    projectId,
    chains: SUPPORTED_CHAINS,
    ssr: false,
  }) as WagmiConfig;
