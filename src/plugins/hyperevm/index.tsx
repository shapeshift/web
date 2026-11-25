import { hyperEvmChainId } from '@shapeshiftoss/caip'
import { hyperevm } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'hyperevmChainAdapter',
      {
        name: 'hyperevmChainAdapter',
        featureFlag: ['HyperEvm'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.HyperEvmMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(hyperEvmChainId, 'erc20')

                return new hyperevm.ChainAdapter({
                  rpcUrl: getConfig().VITE_HYPEREVM_NODE_URL,
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
