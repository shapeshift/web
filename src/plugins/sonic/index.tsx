import { sonicChainId } from '@shapeshiftoss/caip'
import { sonic } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'sonicChainAdapter',
      {
        name: 'sonicChainAdapter',
        featureFlag: ['Sonic'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.SonicMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(sonicChainId, 'erc20')

                return new sonic.ChainAdapter({
                  rpcUrl: getConfig().VITE_SONIC_NODE_URL,
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
