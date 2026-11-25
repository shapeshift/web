import { inkChainId } from '@shapeshiftoss/caip'
import { ink } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'inkChainAdapter',
      {
        name: 'inkChainAdapter',
        featureFlag: ['Ink'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.InkMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(inkChainId, 'erc20')

                return new ink.ChainAdapter({
                  rpcUrl: getConfig().VITE_INK_NODE_URL,
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
