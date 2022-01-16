import type { ISealableVaultFactory, IVault } from '@shapeshiftoss/hdwallet-native-vault'

const nativeVault = import('@shapeshiftoss/hdwallet-native-vault')

export const GENERATE_MNEMONIC: Promise<string> = (async () => {
  return (await nativeVault).GENERATE_MNEMONIC
})()

export const Vault: Promise<ISealableVaultFactory<IVault>> = (async () => {
  return (await nativeVault).Vault
})()
// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Vault = IVault
