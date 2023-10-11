import { WebUSBLedgerAdapter } from '@shapeshiftoss/hdwallet-ledger-webusb'
import { LedgerIcon } from 'components/Icons/LedgerIcon'
import type { SupportedWalletInfo } from 'context/WalletProvider/config'

export const LedgerConfig: Omit<SupportedWalletInfo, 'routes'> = {
  adapters: [WebUSBLedgerAdapter],
  icon: LedgerIcon,
  name: 'Ledger',
}
