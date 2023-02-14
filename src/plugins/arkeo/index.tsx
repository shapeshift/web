import { type Plugins } from 'plugins/types'
import { RouteCategory } from 'Routes/helpers'
import { ArkeoIcon } from 'components/Icons/Arkeo'

import { ArkeoPage } from './Arkeo'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'arkeoAirDrop',
      {
        name: 'arkeoAirDrop',
        featureFlag: ['ArkeoAirdrop'],
        icon: <ArkeoIcon />,
        routes: [
          {
            path: '/arkeo',
            label: 'navBar.arkeo',
            main: ArkeoPage,
            icon: <ArkeoIcon />,
            category: RouteCategory.Explore,
          },
        ],
      },
    ],
  ]
}
