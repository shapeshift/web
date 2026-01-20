import { fromChainId } from "@shapeshiftoss/caip";
import { KnownChainIds } from "@shapeshiftoss/types";
import { getBaseAsset } from "@shapeshiftoss/utils";
import type { Request, Response } from "express";

import type { Chain, ChainsResponse, ChainType, ErrorResponse } from "../types";

const chainNamespaceToType: Record<string, ChainType> = {
  eip155: "evm",
  bip122: "utxo",
  cosmos: "cosmos",
  solana: "solana",
  tron: "tron",
  sui: "sui",
  near: "near",
  starknet: "starknet",
  ton: "ton",
};

const buildChainList = (): Chain[] => {
  const chains: Chain[] = [];

  for (const chainId of Object.values(KnownChainIds)) {
    try {
      const baseAsset = getBaseAsset(chainId);
      const { chainNamespace } = fromChainId(chainId);
      const chainType = chainNamespaceToType[chainNamespace];

      if (!chainType) {
        console.warn(
          `Unknown chain namespace: ${chainNamespace} for chainId: ${chainId}`,
        );
        continue;
      }

      chains.push({
        chainId,
        name: baseAsset.networkName ?? baseAsset.name,
        type: chainType,
        symbol: baseAsset.symbol,
        precision: baseAsset.precision,
        color: baseAsset.color,
        networkColor: baseAsset.networkColor,
        icon: baseAsset.icon,
        networkIcon: baseAsset.networkIcon,
        explorer: baseAsset.explorer,
        explorerAddressLink: baseAsset.explorerAddressLink,
        explorerTxLink: baseAsset.explorerTxLink,
        nativeAssetId: baseAsset.assetId,
      });
    } catch (error) {
      console.warn(`Failed to get base asset for chainId: ${chainId}`, error);
    }
  }

  return chains.sort((a, b) => a.name.localeCompare(b.name));
};

let cachedChains: Chain[] | null = null;

const getChainList = (): Chain[] => {
  if (!cachedChains) {
    cachedChains = buildChainList();
  }
  return cachedChains;
};

export const getChains = (_req: Request, res: Response): void => {
  try {
    const chains = getChainList();

    const response: ChainsResponse = {
      chains,
      timestamp: Date.now(),
    };

    res.json(response);
  } catch (error) {
    console.error("Error in getChains:", error);
    res.status(500).json({ error: "Internal server error" } as ErrorResponse);
  }
};

export const getChainCount = (_req: Request, res: Response): void => {
  try {
    const count = getChainList().length;
    res.json({ count, timestamp: Date.now() });
  } catch (error) {
    console.error("Error in getChainCount:", error);
    res.status(500).json({ error: "Internal server error" } as ErrorResponse);
  }
};
