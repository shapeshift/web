import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { ethereum } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

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
                const http = new unchained.ethereum.V1Api(
                  new unchained.ethereum.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.ethereum.Tx>(
                  getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL,
                )

                return new ethereum.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_ETHEREUM_NODE_URL,
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
