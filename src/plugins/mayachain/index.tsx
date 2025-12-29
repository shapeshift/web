import { mayachain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'mayachainChainAdapter',
      {
        name: 'mayachainChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MayachainMainnet,
              () => {
                return new mayachain.SecondClassMayachainAdapter({
                  nodeUrl: getConfig().VITE_MAYACHAIN_NODE_URL,
                  midgardUrl: getConfig().VITE_MAYACHAIN_MIDGARD_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
