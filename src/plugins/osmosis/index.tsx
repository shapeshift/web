import type { ChainId } from '@keepkey/caip'
import type { ChainAdapter } from '@keepkey/chain-adapters'
import { osmosis } from '@keepkey/chain-adapters'
import { KnownChainIds } from '@keepkey/types'
import * as unchained from '@keepkey/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'osmosisChainAdapter',
      {
        name: 'osmosisChainAdapter',
        featureFlag: 'Osmosis',
        providers: {
          chainAdapters: [
            [
              KnownChainIds.OsmosisMainnet,
              () => {
                const http = new unchained.osmosis.V1Api(
                  new unchained.osmosis.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_OSMOSIS_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.cosmossdk.Tx>(
                  getConfig().REACT_APP_UNCHAINED_OSMOSIS_WS_URL,
                )

                return new osmosis.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Osmosis',
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
