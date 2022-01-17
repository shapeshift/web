import { GENERATE_MNEMONIC, Vault } from '@shapeshiftoss/hdwallet-native-vault'
import { expose } from 'workers'

import type { WorkerType } from './vault'

// eslint-disable-next-line import/no-default-export
export default expose<WorkerType>({
  GENERATE_MNEMONIC,
  Vault
})
