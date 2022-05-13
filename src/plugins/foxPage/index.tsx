import { Plugins } from 'plugins'
import { AssetIcon } from 'components/AssetIcon'

import { FoxPage } from './foxPage'

export function register(): Plugins {
  return [
    [
      'foxPage',
      {
        name: 'foxPage',
        featureFlag: 'FoxPage',
        icon: <AssetIcon src='https://assets.coincap.io/assets/icons/fox@2x.png' />,
        routes: [
          {
            path: '/fox',
            label: 'foxPage',
            main: () => <FoxPage></FoxPage>,
            icon: <AssetIcon src='https://assets.coincap.io/assets/icons/fox@2x.png' />,
          },
        ],
      },
    ],
  ]
}
