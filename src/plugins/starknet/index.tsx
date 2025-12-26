import { starknet } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'starknetChainAdapter',
      {
        name: 'starknetChainAdapter',
        featureFlag: ['Starknet'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.StarknetMainnet,
              () => {
                return new starknet.ChainAdapter({
                  rpcUrl: getConfig().VITE_STARKNET_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
