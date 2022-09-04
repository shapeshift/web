import { WalletConnectCurrentColorIcon } from 'components/Icons/WalletConnectIcon'
import { type Plugins } from 'plugins/types'
import { RouteCategory } from 'Routes/helpers'

import { WalletConnectToDappsExploration } from './WalletConnectToDappsExploration'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'walletConnect',
      {
        name: 'walletConnect',
        icon: <WalletConnectCurrentColorIcon />,
        routes: [
          {
            path: '/dapps',
            label: 'navBar.dApps',
            main: WalletConnectToDappsExploration,
            icon: <WalletConnectCurrentColorIcon />,
            category: RouteCategory.Explore,
          },
        ],
      },
    ],
  ]
}
