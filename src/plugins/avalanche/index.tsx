import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { avalanche } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.avalanche.V1Api(
  new unchained.avalanche.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'avalancheChainAdapter',
      {
        name: 'avalancheChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.AvalancheMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.avalanche.Tx>(
                  getConfig().REACT_APP_UNCHAINED_AVALANCHE_WS_URL,
                )

                return new avalanche.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_AVALANCHE_NODE_URL,
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
