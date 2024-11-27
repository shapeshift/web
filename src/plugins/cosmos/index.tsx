import { cosmos } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import type { Plugins } from 'plugins/types'
import { AssetIcon } from 'components/AssetIcon'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'cosmos:cosmoshub-4',
      {
        name: 'plugins.cosmos.navBar',
        icon: (
          <AssetIcon src='https://rawcdn.githack.com/trustwallet/assets/b7a5f12d893fcf58e0eb1dd64478f076857b720b/blockchains/cosmos/info/logo.png' />
        ),
        providers: {
          chainAdapters: [
            [
              KnownChainIds.CosmosMainnet,
              () => {
                const http = new unchained.cosmos.V1Api(
                  new unchained.cosmos.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_COSMOS_HTTP_URL,
                  }),
                )

                const ws = new unchained.ws.Client<unchained.cosmossdk.Tx>(
                  getConfig().REACT_APP_UNCHAINED_COSMOS_WS_URL,
                )

                return new cosmos.ChainAdapter({
                  providers: { http, ws },
                  coinName: 'Cosmos',
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
