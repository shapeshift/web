import { type Plugins } from 'plugins/types'
import { RouteCategory } from 'Routes/helpers'
import { KeepKeyIcon } from 'components/Icons/KeepKeyIcon'

import { FoxPage } from './foxPage'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'foxPage',
      {
        name: 'foxPage',
        icon: <KeepKeyIcon />,
        routes: [
          {
            path: '/fox',
            label: 'navBar.foxToken',
            main: () => <FoxPage />,
            icon: <KeepKeyIcon />,
            category: RouteCategory.Explore,
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
