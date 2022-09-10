import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { litecoin } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
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
