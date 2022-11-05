import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { avalanche } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

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
                const http = new unchained.avalanche.V1Api(
                  new unchained.avalanche.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL,
                  }),
                )

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
