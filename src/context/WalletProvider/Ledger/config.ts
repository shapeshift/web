import { LedgerIcon } from 'components/Icons/LedgerIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const LedgerConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-ledger-webusb').then(m => m.WebUSBLedgerAdapter),
    },
  ],
  icon: LedgerIcon,
  name: 'Ledger',
}
