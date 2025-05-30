import { bitcoin } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'bitcoinChainAdapter',
      {
        name: 'bitcoinChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.BitcoinMainnet,
              () => {
                const http = new unchained.bitcoin.V1Api(
                  new unchained.bitcoin.Configuration({
                    basePath: getConfig().VITE_UNCHAINED_BITCOIN_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.bitcoin.Tx>(
                  getConfig().VITE_UNCHAINED_BITCOIN_WS_URL,
                )

                return new bitcoin.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Bitcoin',
                  thorMidgardUrl: getConfig().VITE_THORCHAIN_MIDGARD_URL,
                  mayaMidgardUrl: getConfig().VITE_MAYACHAIN_MIDGARD_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
