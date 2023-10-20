import type { WebUSBLedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import { LedgerIcon } from 'components/Icons/LedgerIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

type LedgerConfigType = Omit<SupportedWalletInfo<typeof WebUSBLedgerAdapter>, 'routes'>

export const LedgerConfig: LedgerConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-ledger-webusb').then(m => m.WebUSBLedgerAdapter),
    },
  ],
  icon: LedgerIcon,
  name: 'Ledger',
}
