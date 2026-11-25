import { katanaChainId } from '@shapeshiftoss/caip'
import { katana } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'katanaChainAdapter',
      {
        name: 'katanaChainAdapter',
        featureFlag: ['Katana'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.KatanaMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(katanaChainId, 'erc20')

                return new katana.ChainAdapter({
                  rpcUrl: getConfig().VITE_KATANA_NODE_URL,
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
