import { zcash } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'zcashChainAdapter',
      {
        name: 'zcashChainAdapter',
        featureFlag: ['Zcash'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.ZcashMainnet,
              () => {
                const http = new unchained.zcash.V1Api(
                  new unchained.zcash.Configuration({
                    basePath: getConfig().VITE_UNCHAINED_ZCASH_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.utxo.Tx>(
                  getConfig().VITE_UNCHAINED_ZCASH_WS_URL,
                )

                return new zcash.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Zcash',
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
