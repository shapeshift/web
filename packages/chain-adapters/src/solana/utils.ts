import { bn, bnOrZero } from '@shapeshiftoss/utils'

export const microLamportsToLamports = (microLamports: string): string => {
  return bnOrZero(microLamports).div(bn(10).pow(6)).toFixed()
}
