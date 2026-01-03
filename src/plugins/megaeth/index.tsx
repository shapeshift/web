import { fromAssetId, megaethChainId } from "@shapeshiftoss/caip";
import { megaeth } from "@shapeshiftoss/chain-adapters";
import { KnownChainIds } from "@shapeshiftoss/types";

import { getConfig } from "@/config";
import { getAssetService } from "@/lib/asset-service";
import type { Plugins } from "@/plugins/types";

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      "megaethChainAdapter",
      {
        name: "megaethChainAdapter",
        featureFlag: ["MegaEth"],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MegaEthMainnet,
              () => {
                const getKnownTokens = () => {
                  const assetService = getAssetService();
                  return assetService.assets
                    .filter((asset) => {
                      const { chainId, assetNamespace } = fromAssetId(
                        asset.assetId,
                      );
                      return (
                        chainId === megaethChainId && assetNamespace === "erc20"
                      );
                    })
                    .map((asset) => ({
                      assetId: asset.assetId,
                      contractAddress: fromAssetId(asset.assetId)
                        .assetReference,
                      symbol: asset.symbol,
                      name: asset.name,
                      precision: asset.precision,
                    }));
                };

                return new megaeth.ChainAdapter({
                  rpcUrl: getConfig().VITE_MEGAETH_NODE_URL,
                  getKnownTokens,
                });
              },
            ],
          ],
        },
      },
    ],
  ];
}
