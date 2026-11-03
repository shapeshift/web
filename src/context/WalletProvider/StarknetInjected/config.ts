import type {
  BraavosAdapter,
  BrambleAdapter,
  ReadyWalletAdapter,
  StarknetInjectedProviderId,
} from '@shapeshiftoss/hdwallet-starknet-injected'

import { BraavosIcon } from '@/components/Icons/BraavosIcon'
import { BrambleIcon } from '@/components/Icons/BrambleIcon'
import { ReadyWalletIcon } from '@/components/Icons/ReadyWalletIcon'
import type { SupportedWalletInfo } from '@/context/WalletProvider/config'
import { KeyManager } from '@/context/WalletProvider/KeyManager'

type ReadyWalletConfigType = Omit<SupportedWalletInfo<typeof ReadyWalletAdapter>, 'routes'>
type BraavosConfigType = Omit<SupportedWalletInfo<typeof BraavosAdapter>, 'routes'>
type BrambleConfigType = Omit<SupportedWalletInfo<typeof BrambleAdapter>, 'routes'>

export const ReadyWalletConfig: ReadyWalletConfigType = {
  adapters: [
    {
      loadAdapter: () =>
        import('@shapeshiftoss/hdwallet-starknet-injected').then(m => m.ReadyWalletAdapter),
    },
  ],
  icon: ReadyWalletIcon,
  name: 'Ready Wallet',
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

export type StarknetInjectedKeyManager = KeyManager.ReadyWallet | KeyManager.Braavos | KeyManager.Bramble

export const STARKNET_INJECTED_KEYMANAGERS: StarknetInjectedKeyManager[] = [
  KeyManager.ReadyWallet,
  KeyManager.Braavos,
  KeyManager.Bramble,
]

export const STARKNET_INJECTED_PROVIDER_ID_BY_KEYMANAGER: Record<
  StarknetInjectedKeyManager,
  StarknetInjectedProviderId
> = {
  [KeyManager.ReadyWallet]: 'argentX',
  [KeyManager.Braavos]: 'braavos',
  [KeyManager.Bramble]: 'bramble',
}

export const isStarknetInjectedKeyManager = (
  keyManager: KeyManager | null | undefined,
): keyManager is StarknetInjectedKeyManager =>
  STARKNET_INJECTED_KEYMANAGERS.includes(keyManager as StarknetInjectedKeyManager)
