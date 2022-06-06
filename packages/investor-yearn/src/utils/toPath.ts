import { BIP44Params } from '@shapeshiftoss/types'

export function toPath(bip44Params: BIP44Params): string {
  const { purpose, coinType, accountNumber, isChange = false, index = 0 } = bip44Params
  if (typeof purpose === 'undefined') throw new Error('toPath: bip44Params.purpose is required')
  if (typeof coinType === 'undefined') throw new Error('toPath: bip44Params.coinType is required')
  if (typeof accountNumber === 'undefined')
    throw new Error('toPath: bip44Params.accountNumber is required')
  return `m/${purpose}'/${coinType}'/${accountNumber}'/${Number(isChange)}/${index}`
}
