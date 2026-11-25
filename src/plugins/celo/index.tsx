import { celoChainId } from '@shapeshiftoss/caip'
import { celo } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'celoChainAdapter',
      {
        name: 'celoChainAdapter',
        featureFlag: ['Celo'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.CeloMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(celoChainId, 'erc20')

                return new celo.ChainAdapter({
                  rpcUrl: getConfig().VITE_CELO_NODE_URL,
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
