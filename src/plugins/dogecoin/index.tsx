import { ChainId } from '@shapeshiftoss/caip'
import { ChainAdapter, dogecoin } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'dogecoinChainAdapter',
      {
        name: 'dogecoinChainAdapter',
        featureFlag: 'Dogecoin',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.DogecoinMainnet,
              () => {
                const http = new unchained.bitcoin.V1Api(
                  new unchained.bitcoin.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_DOGECOIN_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.bitcoin.BitcoinTx>(
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
