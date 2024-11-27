import { bnbsmartchain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.bnbsmartchain.V1Api(
  new unchained.bnbsmartchain.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_BNBSMARTCHAIN_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'bscChainAdapter',
      {
        name: 'bscChainAdapter',
        featureFlag: ['BnbSmartChain'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.BnbSmartChainMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.bnbsmartchain.Tx>(
                  getConfig().REACT_APP_UNCHAINED_BNBSMARTCHAIN_WS_URL,
                )

                return new bnbsmartchain.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL,
                  midgardUrl: getConfig().REACT_APP_MIDGARD_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
