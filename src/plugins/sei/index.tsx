import { seiChainId } from '@shapeshiftoss/caip'
import { sei } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'seiChainAdapter',
      {
        name: 'seiChainAdapter',
        featureFlag: ['Sei'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.SeiMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(seiChainId, 'erc20')

                return new sei.ChainAdapter({
                  rpcUrl: getConfig().VITE_SEI_NODE_URL,
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
