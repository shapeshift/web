import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { optimism } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.optimism.V1Api(
  new unchained.optimism.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_OPTIMISM_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'optimismChainAdapter',
      {
        name: 'optimismChainAdapter',
        featureFlag: ['Optimism'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.OptimismMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.optimism.Tx>(
                  getConfig().REACT_APP_UNCHAINED_OPTIMISM_WS_URL,
                )

                return new optimism.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_OPTIMISM_NODE_URL,
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
