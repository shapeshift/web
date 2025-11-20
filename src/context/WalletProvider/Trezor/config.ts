import type { TrezorAdapter } from '@shapeshiftoss/hdwallet-trezor-connect'

import { TrezorIcon } from '@/components/Icons/TrezorIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'

type TrezorConfigType = Omit<SupportedWalletInfo<typeof TrezorAdapter>, 'routes'>

export const TrezorConfig: TrezorConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-trezor-connect').then(m => m.TrezorAdapter),
    },
  ],
  icon: TrezorIcon,
  name: 'Trezor',
}
