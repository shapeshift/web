import { elysiumChainId } from '@shapeshiftoss/caip'
import { elysium } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'elysiumChainAdapter',
      {
        name: 'elysiumChainAdapter',
        featureFlag: ['Elysium'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ElysiumMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(elysiumChainId, 'erc20')

                return new elysium.ChainAdapter({
                  rpcUrl: getConfig().VITE_ELYSIUM_NODE_URL,
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
