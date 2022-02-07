import { BitcoinAccount } from '@shapeshiftoss/unchained-client/dist/generated/bitcoin'

export const makeBtcAccount = (): BitcoinAccount => {
  return {
    pubkey: '336xGpGweq1wtY4kRTuA4w6d7yDkBU9czU',
    balance: '974652',
    unconfirmedBalance: '0',
    addresses: [],
    nextReceiveAddressIndex: 0,
    nextChangeAddressIndex: 0
  }
}
