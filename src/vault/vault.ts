import type { ISealableVaultFactory, IVault } from '@shapeshiftoss/hdwallet-native-vault'
import { wrap } from 'workers'

import Worker from './vault.worker'

export type WorkerType = {
  GENERATE_MNEMONIC: string
  Vault: ISealableVaultFactory<IVault>
}

const worker = wrap<WorkerType>(new Worker())

export const GENERATE_MNEMONIC: Promise<string> = worker.GENERATE_MNEMONIC
export const Vault: Promise<ISealableVaultFactory<IVault>> = worker.Vault

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Vault = IVault
