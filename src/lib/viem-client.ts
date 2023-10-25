import { getConfig } from 'config'
import { createPublicClient, http } from 'viem'
import { arbitrum, avalanche, bsc, gnosis, mainnet, optimism } from 'viem/chains'

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(getConfig().REACT_APP_ETHEREUM_NODE_URL),
})

export const viemBsclient = createPublicClient({
  chain: bsc,
  transport: http(getConfig().REACT_APP_BNBSMARTCHAIN_NODE_URL),
})

export const viemAvalancheClient = createPublicClient({
  chain: avalanche,
  transport: http(getConfig().REACT_APP_AVALANCHE_NODE_URL),
})

export const viemArbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(getConfig().REACT_APP_ARBITRUM_NODE_URL),
})

export const viemOptimismClient = createPublicClient({
  chain: optimism,
  transport: http(getConfig().REACT_APP_OPTIMISM_NODE_URL),
})

export const viemGnosisClient = createPublicClient({
  chain: gnosis,
  transport: http(getConfig().REACT_APP_GNOSIS_NODE_URL),
})
