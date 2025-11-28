import { tron } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'tronChainAdapter',
      {
        name: 'tronChainAdapter',
        featureFlag: ['Tron'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.TronMainnet,
              () => {
                const http = new unchained.tron.TronApi({
                  rpcUrl: getConfig().VITE_TRON_NODE_URL,
                })

                return new tron.ChainAdapter({
                  providers: { http },
                  rpcUrl: getConfig().VITE_TRON_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
