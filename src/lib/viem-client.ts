import { getConfig } from 'config'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

export const viemEthMainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(getConfig().REACT_APP_ETHEREUM_NODE_URL),
})
