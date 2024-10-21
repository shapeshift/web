import { solana } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'solanaChainAdapter',
      {
        name: 'solanaChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.SolanaMainnet,
              () => {
                const http = new unchained.solana.V1Api(
                  new unchained.solana.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_SOLANA_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.solana.Tx>(
                  getConfig().REACT_APP_UNCHAINED_SOLANA_WS_URL,
                )

                return new solana.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_SOLANA_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
