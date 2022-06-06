import { Plugins } from 'plugins'
import { FoxIcon } from 'components/Icons/FoxIcon'

import { FOX_ASSET_ID, FOXY_ASSET_ID } from './FoxCommon'
import { FoxPage } from './foxPage'

export function register(): Plugins {
  return [
    [
      'foxPage',
      {
        name: 'foxPage',
        featureFlag: 'FoxPage',
        icon: <FoxIcon />,
        routes: [
          {
            path: '/fox',
            label: 'navBar.foxToken',
            main: () => <FoxPage activeAssetId={FOX_ASSET_ID}></FoxPage>,
            icon: <FoxIcon />,
            routes: [
              {
                path: '/fox',
                label: 'navBar.foxToken',
                main: () => <FoxPage activeAssetId={FOX_ASSET_ID}></FoxPage>,
              },
              {
                path: '/foxy',
                label: 'navBar.foxToken',
                main: () => <FoxPage activeAssetId={FOXY_ASSET_ID}></FoxPage>,
              },
            ],
          },
        ],
      },
    ],
  ]
}
