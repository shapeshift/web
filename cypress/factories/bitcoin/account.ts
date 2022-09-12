import type { bitcoin } from '@shapeshiftoss/unchained-client'

export const makeBtcAccount = (): bitcoin.Account => {
  return {
    pubkey: '336xGpGweq1wtY4kRTuA4w6d7yDkBU9czU',
    balance: '974652',
    unconfirmedBalance: '0',
    addresses: [],
    nextReceiveAddressIndex: 0,
    nextChangeAddressIndex: 0,
  }
}
