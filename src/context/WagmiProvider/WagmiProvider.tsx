import { getConfig } from 'config'
import last from 'lodash/last'
import { configureChains, createClient, WagmiConfig } from 'wagmi'
import { avalanche, mainnet } from 'wagmi/chains'
import { infuraProvider } from 'wagmi/providers/infura'
import { jsonRpcProvider } from 'wagmi/providers/jsonRpc'

const infuraApiKey = last(getConfig().REACT_APP_ETHEREUM_INFURA_URL.split('/')) ?? ''
const { provider } = configureChains(
  [mainnet, avalanche],
  [
    infuraProvider({ apiKey: infuraApiKey }),
    jsonRpcProvider({
      rpc: chain => {
        if (chain.id !== avalanche.id) return null
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
