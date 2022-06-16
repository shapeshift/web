import { FoxIcon } from 'components/Icons/FoxIcon'

import { FoxPage } from './foxPage'

export function register() {
  return {
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
  } as const
}
