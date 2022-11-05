import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { dogecoin } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'dogecoinChainAdapter',
      {
        name: 'dogecoinChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.DogecoinMainnet,
              () => {
                const http = new unchained.dogecoin.V1Api(
                  new unchained.dogecoin.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.dogecoin.Tx>(
                  getConfig().REACT_APP_UNCHAINED_DOGECOIN_WS_URL,
                )

                return new dogecoin.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Dogecoin',
                }) as unknown as ChainAdapter<ChainId>
              },
            ],
          ],
        },
      },
    ],
  ]
}
