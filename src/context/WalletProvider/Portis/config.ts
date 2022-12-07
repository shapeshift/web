import { PortisAdapter } from '@shapeshiftoss/hdwallet-portis'
import { PortisIcon } from 'components/Icons/PortisIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const PortisConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapter: PortisAdapter,
  supportsMobile: 'browser',
  icon: PortisIcon,
  name: 'Portis',
}
