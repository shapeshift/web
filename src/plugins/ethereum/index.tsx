import { ChainAdapter as EthereumChainAdapter } from '@shapeshiftoss/chain-adapters/dist/ethereum/EthereumChainAdapter'
import { ChainTypes } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import { getConfig } from 'config'
import { Plugins } from 'plugins'

import { AssetIcon } from '../../components/AssetIcon'
import { EthereumAsset } from './EthereumAsset'

export function register(): Plugins {
  return [
    [
      'ethereumChainAdapter',
      {
        name: 'ethereumChainAdapter',
        providers: {
          chainAdapters: [
            [
              ChainTypes.Ethereum,
              () => {
                const http = new unchained.ethereum.V1Api(
                  new unchained.ethereum.Configuration({
                    basePath: getConfig().REACT_APP_UNCHAINED_ETHEREUM_HTTP_URL
                  })
                )

                const ws = new unchained.ws.Client<unchained.ethereum.ParsedTx>(
                  getConfig().REACT_APP_UNCHAINED_ETHEREUM_WS_URL
                )

                return new EthereumChainAdapter({ providers: { http, ws } })
              }
            ]
          ]
        },
        routes: [
          {
            path: '/assets/eip155\\:1/:assetSubId',
            hide: true,
            label: '',
            main: () => <EthereumAsset chainId={'eip155:1'} />,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/atom@2x.png' />
          }
        ]
      }
    ]
  ]
}
