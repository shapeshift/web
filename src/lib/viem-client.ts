import { mainnet } from '@wagmi/chains'
import { getConfig } from 'config'
import { createPublicClient, http } from 'viem'

export const viemClient = createPublicClient({
  chain: mainnet,
  transport: http(getConfig().REACT_APP_ETHEREUM_NODE_URL),
})
