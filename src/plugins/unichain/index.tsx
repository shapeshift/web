import { unichainChainId } from '@shapeshiftoss/caip'
import { unichain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'unichainChainAdapter',
      {
        name: 'unichainChainAdapter',
        featureFlag: ['Unichain'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.UnichainMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(unichainChainId, 'erc20')

                return new unichain.ChainAdapter({
                  rpcUrl: getConfig().VITE_UNICHAIN_NODE_URL,
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
