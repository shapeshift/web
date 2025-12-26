import { near } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'nearChainAdapter',
      {
        name: 'nearChainAdapter',
        featureFlag: ['Near'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.NearMainnet,
              () => {
                return new near.ChainAdapter({
                  rpcUrl: getConfig().VITE_NEAR_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
