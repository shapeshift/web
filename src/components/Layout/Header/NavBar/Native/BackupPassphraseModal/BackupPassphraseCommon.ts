import type { RevocableWallet } from 'context/WalletProvider/MobileWallet/RevocableWallet'

export enum BackupPassphraseRoutes {
  Start = '/backup-passphrase/',
  Password = '/backup-passphrase/password',
  Info = '/backup-passphrase/info',
  Test = '/backup-passphrase/test',
  Success = '/backup-passphrase/success',
}

export type LocationState = {
  revocableWallet: RevocableWallet
}
