import { Plugins } from 'plugins'
import { FoxIcon } from 'components/Icons/FoxIcon'

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
            main: () => <FoxPage />,
            icon: <FoxIcon />,
            routes: [
              {
                path: '/fox',
                label: 'navBar.foxToken',
                main: () => <FoxPage />,
              },
              {
                path: '/foxy',
                label: 'navBar.foxToken',
                main: () => <FoxPage />,
              },
            ],
          },
        ],
      },
    ],
  ]
}
