import { monadChainId } from '@shapeshiftoss/caip'
import { monad } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'monadChainAdapter',
      {
        name: 'monadChainAdapter',
        featureFlag: ['Monad'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MonadMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(monadChainId, 'erc20')

                return new monad.ChainAdapter({
                  rpcUrl: getConfig().VITE_MONAD_NODE_URL,
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
