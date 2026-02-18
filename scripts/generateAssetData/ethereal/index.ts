import type { Asset } from '@shapeshiftoss/types'
import { ethereal, unfreeze } from '@shapeshiftoss/utils'

export const getAssets = (): Asset[] => {
  return [unfreeze(ethereal)]
}
