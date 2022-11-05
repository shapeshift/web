import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { litecoin } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'litecoinChainAdapter',
      {
        name: 'litecoinChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.LitecoinMainnet,
              () => {
                const http = new unchained.litecoin.V1Api(
                  new unchained.litecoin.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_LITECOIN_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.litecoin.Tx>(
                  getConfig().REACT_APP_UNCHAINED_LITECOIN_WS_URL,
                )

                return new litecoin.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Litecoin',
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
