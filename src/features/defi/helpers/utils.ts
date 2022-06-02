import { cosmosChainId, osmosisChainId } from '@shapeshiftoss/caip'
import { ChainId } from '@shapeshiftoss/caip'

export const chainIdToLabel = (chainId: ChainId): string => {
  switch (chainId) {
    case cosmosChainId:
      return 'Cosmos'
    case osmosisChainId:
      return 'Osmosis'
    default: {
      return ''
    }
  }
}
