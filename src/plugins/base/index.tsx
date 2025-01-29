import { base } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.base.V1Api(
  new unchained.base.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_BASE_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'baseChainAdapter',
      {
        name: 'baseChainAdapter',
        featureFlag: ['Base'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.BaseMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.base.Tx>(
                  getConfig().REACT_APP_UNCHAINED_BASE_WS_URL,
                )

                return new base.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_BASE_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
