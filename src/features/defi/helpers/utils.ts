import { ChainId } from '@shapeshiftoss/caip'

export const chainIdToLabel = (chainId: ChainId): string => {
  switch (chainId) {
    case 'cosmos:cosmoshub-4':
      return 'Cosmos'
    case 'cosmos:osmosis-1':
      return 'Osmosis'
    default: {
      return ''
    }
  }
}
