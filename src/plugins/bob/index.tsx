import { bobChainId } from '@shapeshiftoss/caip'
import { bob } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'bobChainAdapter',
      {
        name: 'bobChainAdapter',
        featureFlag: ['Bob'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.BobMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(bobChainId, 'erc20')

                return new bob.ChainAdapter({
                  rpcUrl: getConfig().VITE_BOB_NODE_URL,
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
