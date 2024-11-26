import { ethereum } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.ethereum.V1Api(
  new unchained.ethereum.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
  }),
)

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'ethereumChainAdapter',
      {
        name: 'ethereumChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.EthereumMainnet,
              () => {
                const ws = new unchained.ws.Client<unchained.ethereum.Tx>(
                  getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
                )

                return new ethereum.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
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
