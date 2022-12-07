import { type Plugins } from 'plugins/types'
import { RouteCategory } from 'Routes/helpers'
import { FoxIcon } from 'components/Icons/FoxIcon'

import { FoxPage } from './foxPage'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'foxPage',
      {
        name: 'foxPage',
        icon: <FoxIcon />,
        routes: [
          {
            path: '/fox',
            label: 'navBar.foxToken',
            main: () => <FoxPage />,
            icon: <FoxIcon />,
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
