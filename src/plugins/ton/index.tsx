import { ton } from "@shapeshiftoss/chain-adapters";
import { KnownChainIds } from "@shapeshiftoss/types";

import { getConfig } from "@/config";
import type { Plugins } from "@/plugins/types";

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      "tonChainAdapter",
      {
        name: "tonChainAdapter",
        featureFlag: ["Ton"],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.TonMainnet,
              () => {
                return new ton.ChainAdapter({
                  rpcUrl: getConfig().VITE_TON_NODE_URL,
                });
              },
            ],
          ],
        },
      },
    ],
  ];
}
