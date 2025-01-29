import { arbitrumNova } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.arbitrumNova.V1Api(
  new unchained.arbitrumNova.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_ARBITRUM_NOVA_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'arbitrumNovaChainAdapter',
      {
        name: 'arbitrumNovaChainAdapter',
        featureFlag: ['ArbitrumNova'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ArbitrumNovaMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.arbitrumNova.Tx>(
                  getConfig().REACT_APP_UNCHAINED_ARBITRUM_NOVA_WS_URL,
                )

                return new arbitrumNova.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_ARBITRUM_NOVA_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
