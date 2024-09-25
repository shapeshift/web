import type { PhantomAdapter } from '@shapeshiftoss/hdwallet-phantom'
import { PhantomIcon } from 'components/Icons/PhantomIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type PhantomConfigType = Omit<SupportedWalletInfo<typeof PhantomAdapter>, 'routes'>

export const PhantomConfig: PhantomConfigType = {
  adapters: [
    {
      loadAdapter: () => import('@shapeshiftoss/hdwallet-phantom').then(m => m.PhantomAdapter),
    },
  ],
  supportsMobile: 'browser',
  icon: PhantomIcon,
  name: 'Phantom',
}
