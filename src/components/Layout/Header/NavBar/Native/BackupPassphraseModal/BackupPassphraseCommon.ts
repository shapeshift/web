import type { Vault } from '@shapeshiftoss/hdwallet-native-vault'

export enum BackupPassphraseRoutes {
  Password = '/backup-passphrase/password',
  Info = '/backup-passphrase/info',
  Test = '/backup-passphrase/test',
  Success = '/backup-passphrase/success',
}

export type LocationState = { vault: Vault }
