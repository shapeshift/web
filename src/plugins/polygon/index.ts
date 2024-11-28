import { polygon } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'

// I'm an unchained-client wrapper around `/api/v1/` endpoints
// If you ever need to consume endpoints which are not abstracted by chain-adapters, consume me
export const http = new unchained.polygon.V1Api(
  new unchained.polygon.Configuration({
    basePath: getConfig().REACT_APP_UNCHAINED_POLYGON_HTTP_URL,
  }),
)

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
                const ws = new unchained.ws.Client<unchained.polygon.Tx>(
                  getConfig().REACT_APP_UNCHAINED_POLYGON_WS_URL,
                )

                return new polygon.ChainAdapter({
                  providers: { http, ws },
                  rpcUrl: getConfig().REACT_APP_POLYGON_NODE_URL,
                })
              },
            ],
          ],
        },
      },
    ],
  ]
}
