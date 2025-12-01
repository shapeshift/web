import { sui } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'suiChainAdapter',
      {
        name: 'suiChainAdapter',
        featureFlag: ['Sui'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.SuiMainnet,
              () => {
                return new sui.ChainAdapter({
                  rpcUrl: getConfig().VITE_SUI_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
