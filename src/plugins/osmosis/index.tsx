import { ChainAdapter as OsmosisChainAdapter } from '@shapeshiftoss/chain-adapters/dist/cosmossdk/osmosis/OsmosisChainAdapter'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'

export function register(): Plugins {
  return [
    [
      'osmosisChainAdapter',
      {
        name: 'osmosisChainAdapter',
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

                return new OsmosisChainAdapter({ providers: { http, ws }, coinName: 'Osmosis' })
              },
            ],
          ],
        },
      },
    ],
  ]
}