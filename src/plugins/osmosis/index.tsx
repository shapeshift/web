import { cosmossdk } from '@shapeshiftoss/chain-adapters'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { Plugins } from 'plugins'

import { getConfig } from './config'

export function register(): Plugins {
  return [
    [
      'osmosisChainAdapter',
      {
        name: 'osmosisChainAdapter',
        featureFlag: 'Osmosis',
        providers: {
          chainAdapters: [
            [
              ChainTypes.Osmosis,
              () => {
                const http = new unchained.osmosis.V1Api(
                  new unchained.osmosis.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.osmosis.Tx>(
                  getConfig().REACT_APP_UNCHAINED_OSMOSIS_WS_URL,
                )

                return new cosmossdk.osmosis.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Osmosis',
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
