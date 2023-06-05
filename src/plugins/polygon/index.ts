import type { ChainId } from '@shapeshiftoss/caip'
import type { ChainAdapter } from '@shapeshiftoss/chain-adapters'
import { polygon } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { type Plugins } from 'plugins/types'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'polygonChainAdapter',
      {
        name: 'polygonChainAdapter',
        featureFlag: ['Polygon'],
        providers: {
          chainAdapters: [
            [
              KnownChainIds.PolygonMainnet,
              () => {
                const http = new unchained.polygon.V1Api(
                  new unchained.polygon.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_POLYGON_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.polygon.Tx>(
                  getConfig().REACT_APP_UNCHAINED_POLYGON_WS_URL,
                )

                return new polygon.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_POLYGON_NODE_URL,
                }) as unknown as ChainAdapter<ChainId> // FIXME: this is silly
              },
            ],
          ],
        },
      },
    ],
  ]
}
