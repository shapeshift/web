import type {
  BraavosAdapter,
  BrambleAdapter,
  ReadyAdapter,
} from '@shapeshiftoss/hdwallet-starknet-injected'

import { BraavosIcon } from '@/components/Icons/BraavosIcon'
import { BrambleIcon } from '@/components/Icons/BrambleIcon'
import { ReadyIcon } from '@/components/Icons/ReadyIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'

type ReadyConfigType = Omit<SupportedWalletInfo<typeof ReadyAdapter>, 'routes'>
type BraavosConfigType = Omit<SupportedWalletInfo<typeof BraavosAdapter>, 'routes'>
type BrambleConfigType = Omit<SupportedWalletInfo<typeof BrambleAdapter>, 'routes'>

export const ReadyConfig: ReadyConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-starknet-injected').then(m => m.ReadyAdapter),
    },
  ],
  icon: ReadyIcon,
  name: 'Ready',
}

export const BraavosConfig: BraavosConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-starknet-injected').then(m => m.BraavosAdapter),
    },
  ],
  icon: BraavosIcon,
  name: 'Braavos',
}

export const BrambleConfig: BrambleConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-starknet-injected').then(m => m.BrambleAdapter),
    },
  ],
  icon: BrambleIcon,
  name: 'Bramble',
}

export type StarknetInjectedKeyManager = KeyManager.Ready | KeyManager.Braavos | KeyManager.Bramble

export const STARKNET_INJECTED_KEYMANAGERS: StarknetInjectedKeyManager[] = [
  KeyManager.Ready,
  KeyManager.Braavos,
  KeyManager.Bramble,
]

export const isStarknetInjectedKeyManager = (
  keyManager: KeyManager | null | undefined,
): keyManager is StarknetInjectedKeyManager =>
  STARKNET_INJECTED_KEYMANAGERS.includes(keyManager as StarknetInjectedKeyManager)
