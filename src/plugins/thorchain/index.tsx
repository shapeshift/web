import { thorchain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'thorchainChainAdapter',
      {
        name: 'thorchainChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ThorchainMainnet,
              () => {
                return new thorchain.SecondClassThorchainAdapter({
                  nodeUrl: getConfig().VITE_THORCHAIN_NODE_URL,
                  thorMidgardUrl: getConfig().VITE_THORCHAIN_MIDGARD_URL,
                  mayaMidgardUrl: getConfig().VITE_MAYACHAIN_MIDGARD_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
