import { ChainId } from '@shapeshiftoss/caip'
import { avalanche, ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'

export function register(): Plugins {
  return [
    [
      'avalancheChainAdapter',
      {
        name: 'avalancheChainAdapter',
        featureFlag: 'Avalanche',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.AvalancheMainnet,
              () => {
                const http = new unchained.ethereum.V1Api(
                  new unchained.avalanche.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_AVALANCHE_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.avalanche.AvalancheTx>(
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
