import { mantleChainId } from '@shapeshiftoss/caip'
import { mantle } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'mantleChainAdapter',
      {
        name: 'mantleChainAdapter',
        featureFlag: ['Mantle'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MantleMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(mantleChainId, 'erc20')

                return new mantle.ChainAdapter({
                  rpcUrl: getConfig().VITE_MANTLE_NODE_URL,
                  getKnownTokens,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
