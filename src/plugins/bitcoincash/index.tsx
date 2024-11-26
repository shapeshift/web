import { bitcoincash } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

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
