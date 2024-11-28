import { arbitrum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.arbitrum.V1Api(
  new unchained.arbitrum.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_ARBITRUM_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'arbitrumChainAdapter',
      {
        name: 'arbitrumChainAdapter',
        featureFlag: ['Arbitrum'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ArbitrumMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.arbitrum.Tx>(
                  getConfig().REACT_APP_UNCHAINED_ARBITRUM_WS_URL,
                )

                return new arbitrum.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_ARBITRUM_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
