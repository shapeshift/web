import type { AppKitNetwork } from '@reown/appkit/networks'
import {
  arbitrum,
  avalanche,
  base,
  bitcoin,
  bsc,
  gnosis,
  hyperEvm,
  katana,
  mainnet,
  megaeth,
  monad,
  optimism,
  plasma,
  polygon,
  solana,
} from '@reown/appkit/networks'
import { createAppKit, modal } from '@reown/appkit/react'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import type { Config } from 'wagmi'

const EVM_NETWORKS: readonly AppKitNetwork[] = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
  monad,
  megaeth,
  hyperEvm,
  plasma,
  katana,
]

const ALL_NETWORKS: readonly AppKitNetwork[] = [...EVM_NETWORKS, bitcoin, solana]

// AppKit keeps a module-level `modal` singleton, set by `createAppKit` whether
// it's called by this widget (self-init) or by the host app. Reading it lets the
// widget detect — and hook into — an AppKit the host already initialized, as long
// as `@reown/appkit*` is deduped to a single shared copy in the consumer's tree.
export const isAppKitInitialized = (): boolean => modal !== undefined

// The active wagmi Config, read off the AppKit singleton's EVM adapter. Works in
// both modes — self-init (we registered the adapter via createAppKit) and
// host-owned (the host's adapter). Because the widget can pull the shared config
// from the singleton, it builds its own WagmiProvider from it — so a host only
// needs to call `createAppKit()`, with no WagmiProvider/QueryClient wrapping.
export const getActiveWagmiConfig = (): Config | undefined => {
  const evmAdapter = modal?.chainAdapters?.eip155 as WagmiAdapter | undefined
  return evmAdapter?.wagmiConfig
}

export const initializeAppKit = (projectId: string): void => {
  // Already initialized — either by a previous call here, or by the host app. In
  // the latter case we skip entirely and reuse the host's AppKit + wagmi config.
  if (modal) return

  const wagmiAdapter = new WagmiAdapter({
    networks: [...EVM_NETWORKS],
    projectId,
  })

  const bitcoinAdapter = new BitcoinAdapter()
  const solanaAdapter = new SolanaAdapter({
    wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()] as any,
  })

  createAppKit({
    adapters: [wagmiAdapter, bitcoinAdapter, solanaAdapter],
    projectId,
    networks: [...ALL_NETWORKS] as [AppKitNetwork, ...AppKitNetwork[]],
    features: {
      send: false,
    },
  })
}
