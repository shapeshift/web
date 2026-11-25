import { robinhoodChainId } from '@shapeshiftoss/caip'
import { robinhood } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'

import { getConfig } from '@/config'
import { createGetKnownTokens } from '@/lib/asset-service'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'robinhoodChainAdapter',
      {
        name: 'robinhoodChainAdapter',
        featureFlag: ['Robinhood'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.RobinhoodMainnet,
              () => {
                const getKnownTokens = createGetKnownTokens(robinhoodChainId, 'erc20')

                return new robinhood.ChainAdapter({
                  rpcUrl: getConfig().VITE_ROBINHOOD_NODE_URL,
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
