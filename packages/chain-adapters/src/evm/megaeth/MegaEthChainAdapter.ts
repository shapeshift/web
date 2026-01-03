import type { AssetId } from "@shapeshiftoss/caip";
import { ASSET_REFERENCE, megaethAssetId } from "@shapeshiftoss/caip";
import type { RootBip44Params } from "@shapeshiftoss/types";
import { KnownChainIds } from "@shapeshiftoss/types";

import { ChainAdapterDisplayName } from "../../types";
import type { TokenInfo } from "../SecondClassEvmAdapter";
import { SecondClassEvmAdapter } from "../SecondClassEvmAdapter";

const SUPPORTED_CHAIN_IDS = [KnownChainIds.MegaEthMainnet];
const DEFAULT_CHAIN_ID = KnownChainIds.MegaEthMainnet;

export type ChainAdapterArgs = {
  rpcUrl: string;
  getKnownTokens: () => TokenInfo[];
};

export const isMegaEthChainAdapter = (
  adapter: unknown,
): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.MegaEthMainnet;
};

export class ChainAdapter extends SecondClassEvmAdapter<KnownChainIds.MegaEthMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.MegaEth),
    accountNumber: 0,
  };

  constructor(args: ChainAdapterArgs) {
    super({
      assetId: megaethAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      rpcUrl: args.rpcUrl,
      getKnownTokens: args.getKnownTokens,
    });
  }

  getDisplayName() {
    return ChainAdapterDisplayName.MegaEth;
  }

  getName() {
    return "MegaETH";
  }

  getType(): KnownChainIds.MegaEthMainnet {
    return KnownChainIds.MegaEthMainnet;
  }

  getFeeAssetId(): AssetId {
    return this.assetId;
  }
}

export type { TokenInfo };
