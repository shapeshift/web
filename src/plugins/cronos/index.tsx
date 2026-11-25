import { cronosChainId } from '@shapeshiftoss/caip'
import { cronos } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'cronosChainAdapter',
      {
        name: 'cronosChainAdapter',
        featureFlag: ['Cronos'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.CronosMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(cronosChainId, 'erc20')

                return new cronos.ChainAdapter({
                  rpcUrl: getConfig().VITE_CRONOS_NODE_URL,
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
