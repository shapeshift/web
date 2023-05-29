import { KnownChainIds } from "@shapeshiftoss/types"
import { CowChainId } from "../types"

export const isCowswapSupportedChainId = (
    chainId: string | undefined,
  ): chainId is CowChainId => {
    return chainId === KnownChainIds.EthereumMainnet || chainId === KnownChainIds.GnosisMainnet
  }