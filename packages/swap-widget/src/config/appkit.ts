import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { BitcoinAdapter } from '@reown/appkit-adapter-bitcoin'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import {
  mainnet,
  polygon,
  arbitrum,
  arbitrumNova,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
  bitcoin,
  solana,
} from '@reown/appkit/networks'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'

export const EVM_NETWORKS = [
  mainnet,
  polygon,
  arbitrum,
  arbitrumNova,
  optimism,
  base,
  avalanche,
  bsc,
  gnosis,
] as const

export const ALL_NETWORKS = [
  ...EVM_NETWORKS,
  bitcoin,
  solana,
] as const

export type SupportedNetwork = (typeof ALL_NETWORKS)[number]
export type EvmNetwork = (typeof EVM_NETWORKS)[number]

const APP_METADATA = {
  name: 'ShapeShift Swap Widget',
  description: 'Multi-chain swap widget powered by ShapeShift',
  url: 'https://shapeshift.com',
  icons: ['https://shapeshift.com/icon.png'],
}

let wagmiAdapter: WagmiAdapter | null = null
let bitcoinAdapter: BitcoinAdapter | null = null
let solanaAdapter: SolanaAdapter | null = null
let appKitInitialized = false

export const createWagmiAdapter = (projectId: string): WagmiAdapter => {
  if (!wagmiAdapter) {
    wagmiAdapter = new WagmiAdapter({
      networks: EVM_NETWORKS,
      projectId,
    })
  }
  return wagmiAdapter
}

export const createBitcoinAdapter = (): BitcoinAdapter => {
  if (!bitcoinAdapter) {
    bitcoinAdapter = new BitcoinAdapter()
  }
  return bitcoinAdapter
}

export const createSolanaAdapter = (): SolanaAdapter => {
  if (!solanaAdapter) {
    solanaAdapter = new SolanaAdapter({
      wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    })
  }
  return solanaAdapter
}

export const getWagmiAdapter = (): WagmiAdapter | null => wagmiAdapter

export const initializeAppKit = (projectId: string): void => {
  if (appKitInitialized) {
    return
  }

  const wagmi = createWagmiAdapter(projectId)
  const btc = createBitcoinAdapter()
  const sol = createSolanaAdapter()

  createAppKit({
    adapters: [wagmi, btc, sol],
    projectId,
    networks: ALL_NETWORKS,
    metadata: APP_METADATA,
  })

  appKitInitialized = true
}

export const isAppKitInitialized = (): boolean => appKitInitialized
