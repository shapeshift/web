import { http, createConfig } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { injected, walletConnect } from 'wagmi/connectors'

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo'

if (projectId === 'demo') {
  console.warn('[affiliate-dashboard] VITE_WALLETCONNECT_PROJECT_ID is not set — WalletConnect may not work in production.')
}

export const config = createConfig({
  chains: [arbitrum],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [arbitrum.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
