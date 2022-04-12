import { ChainTypes } from '@shapeshiftoss/types'

export const chainTypeToLabel = (chain: ChainTypes): string => {
  switch (chain) {
    case ChainTypes.Cosmos:
      return 'Cosmos'
    case ChainTypes.Osmosis:
      return 'Osmosis'
    default: {
      return ''
    }
  }
}
