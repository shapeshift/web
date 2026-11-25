import { megaethChainId } from '@shapeshiftoss/caip'
import { megaeth } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'megaethChainAdapter',
      {
        name: 'megaethChainAdapter',
        featureFlag: ['MegaEth'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MegaEthMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(megaethChainId, 'erc20')

                return new megaeth.ChainAdapter({
                  rpcUrl: getConfig().VITE_MEGAETH_NODE_URL,
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
