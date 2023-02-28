import { TallyHoAdapter } from '@shapeshiftoss/hdwallet-tallyho'
import { TallyHoIcon } from 'components/Icons/TallyHoIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const TallyHoConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [TallyHoAdapter],
  icon: TallyHoIcon,
  name: 'TallyHo',
}
