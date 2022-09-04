import {
  WalletConnectCurrentColorIcon
} from 'components/Icons/WalletConnectIcon'
import { type Plugins } from 'plugins/types'
import { RouteCategory } from 'Routes/helpers'

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
            main: () => <div style={{ width: 100, height: 100, backgroundColor: 'red' }} />,
            icon: <WalletConnectCurrentColorIcon />,
            category: RouteCategory.Explore,
          },
        ],
      },
    ],
  ]
}
