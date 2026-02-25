/**
 * Standalone wagmi configuration for read-only RPC access.
 *
 * Used by SwapWidgetWithExternalWallet so balance-fetching hooks
 * (useConfig, getBalance, readContract) work without AppKit / WalletConnect.
 */

import { arbitrum, avalanche, base, bsc, gnosis, mainnet, optimism, polygon } from 'viem/chains'
import { createConfig, http } from 'wagmi'

const chains = [mainnet, polygon, arbitrum, optimism, base, avalanche, bsc, gnosis] as const

export const standaloneWagmiConfig = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [avalanche.id]: http(),
    [bsc.id]: http(),
    [gnosis.id]: http(),
  },
})
