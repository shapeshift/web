import { Plugins } from 'plugins'
import { FoxIcon } from 'components/Icons/FoxIcon'

import { FoxAssetId, FoxyAssetId } from './FoxCommon'
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
            main: () => <FoxPage activeAssetId={FoxAssetId}></FoxPage>,
            icon: <FoxIcon />,
            routes: [
              {
                path: '/fox',
                label: 'navBar.foxToken',
                main: () => <FoxPage activeAssetId={FoxAssetId}></FoxPage>,
              },
              {
                path: '/foxy',
                label: 'navBar.foxToken',
                main: () => <FoxPage activeAssetId={FoxyAssetId}></FoxPage>,
              },
            ],
          },
        ],
      },
    ],
  ]
}
