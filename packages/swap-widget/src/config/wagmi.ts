import { getDefaultConfig } from "@rainbow-me/rainbowkit";
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

export const createWagmiConfig = (
  projectId: string,
  appName: string = "ShapeShift Swap Widget",
) =>
  getDefaultConfig({
    appName,
    projectId,
    chains: SUPPORTED_CHAINS,
    ssr: false,
  });
