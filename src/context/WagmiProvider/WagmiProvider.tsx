import { getConfig } from 'config'
import last from 'lodash/last'
import type { Chain } from 'wagmi'
import { chain, configureChains, createClient, WagmiConfig } from 'wagmi'
import { infuraProvider } from 'wagmi/providers/infura'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'

const avalancheChain: Chain = {
  id: 43_114,
  name: 'Avalanche',
  network: 'avalanche',
  nativeCurrency: {
    decimals: 18,
    name: 'Avalanche',
    symbol: 'AVAX',
  },
  rpcUrls: {
    default: 'https://api.avax.network/ext/bc/C/rpc',
  },
  blockExplorers: {
    default: { name: 'SnowTrace', url: 'https://snowtrace.io' },
  },
  testnet: false,
}

const infuraApiKey = last(getConfig().REACT_APP_ETHEREUM_INFURA_URL.split('/')) ?? ''
const { provider } = configureChains(
  [chain.mainnet, avalancheChain],
  [
    infuraProvider({ apiKey: infuraApiKey }),
    jsonRpcProvider({
      rpc: chain => {
        if (chain.id !== avalancheChain.id) return null
        return { http: getConfig().REACT_APP_AVALANCHE_NODE_URL }
      },
    }),
  ],
)

const client = createClient({
  provider,
})

export const WagmiProvider = ({ children }: { children: React.ReactNode }) => (
  <WagmiConfig client={client}>{children}</WagmiConfig>
)
