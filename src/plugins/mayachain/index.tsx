import { mayachain } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'

import { getConfig } from '@/config'
import type { Plugins } from '@/plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'mayachainChainAdapter',
      {
        name: 'mayachainChainAdapter',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.MayachainMainnet,
              () => {
                const http = new unchained.mayachain.V1Api(
                  new unchained.mayachain.Configuration({
                    basePath: getConfig().VITE_UNCHAINED_MAYACHAIN_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.cosmossdk.Tx>(
                  getConfig().VITE_UNCHAINED_MAYACHAIN_WS_URL,
                )

                return new mayachain.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Mayachain',
                  midgardUrl: getConfig().VITE_MAYACHAIN_MIDGARD_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
