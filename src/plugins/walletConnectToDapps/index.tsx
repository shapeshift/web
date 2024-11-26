import type { Plugins } from 'plugins/types'
import { WalletConnectCurrentColorIcon } from 'components/Icons/WalletConnectIcon'

// eslint-disable-next-line import/no-default-export
export default function register(): Plugins {
  return [
    [
      'walletConnect',
      {
        name: 'walletConnect',
        featureFlag: ['WalletConnectToDappsV2'],
        icon: <WalletConnectCurrentColorIcon />,
        routes: [],
      },
    ],
  ]
}
