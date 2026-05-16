import { aptos } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'aptosChainAdapter',
      {
        name: 'aptosChainAdapter',
        featureFlag: ['Aptos'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.AptosMainnet,
              () => {
                return new aptos.ChainAdapter({
                  rpcUrl: getConfig().VITE_APTOS_NODE_URL,
                  indexerUrl: getConfig().VITE_APTOS_INDEXER_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
