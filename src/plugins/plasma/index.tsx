import { plasmaChainId } from '@shapeshiftoss/caip'
import { plasma } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'plasmaChainAdapter',
      {
        name: 'plasmaChainAdapter',
        featureFlag: ['Plasma'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.PlasmaMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(plasmaChainId, 'erc20')

                return new plasma.ChainAdapter({
                  rpcUrl: getConfig().VITE_PLASMA_NODE_URL,
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
