import { etherealChainId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { ethereal, unfreeze } from '@shapeshiftoss/utils'

export const getAssets = async (): Promise<Asset[]> => {
  return [unfreeze(ethereal)]
}

export { etherealChainId }
