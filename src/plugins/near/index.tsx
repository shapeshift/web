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
                const config = getConfig()
                const rpcUrls = [
                  config.VITE_NEAR_NODE_URL,
                  config.VITE_NEAR_NODE_URL_FALLBACK_1,
                  config.VITE_NEAR_NODE_URL_FALLBACK_2,
                ].filter(Boolean)

                return new near.ChainAdapter({
                  rpcUrls,
                  fastNearApiUrl: config.VITE_FASTNEAR_API_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
