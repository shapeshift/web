import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { bitcoincash } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'bitcoinCashChainAdapter',
      {
        name: 'bitcoinCashChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.BitcoinCashMainnet,
              () => {
                const http = new unchained.bitcoincash.V1Api(
                  new unchained.bitcoincash.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_BITCOINCASH_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.bitcoincash.Tx>(
                  getConfig().REACT_APP_UNCHAINED_BITCOINCASH_WS_URL,
                )

                return new bitcoincash.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'BitcoinCash',
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
