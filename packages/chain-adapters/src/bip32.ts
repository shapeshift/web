import { BIP32Params } from '@shapeshiftoss/types'

export const toRootDerivationPath = (bip32Params: BIP32Params): string => {
  const { purpose, coinType, accountNumber, isChange = false, index = 0 } = bip32Params
  if (typeof purpose === 'undefined') throw new Error('toPath: bip32Params.purpose is required')
  if (typeof coinType === 'undefined') throw new Error('toPath: bip32Params.coinType is required')
  if (typeof accountNumber === 'undefined')
    throw new Error('toPath: bip32Params.accountNumber is required')
  return `m/${purpose}'/${coinType}'/${accountNumber}'`
}

export const toPath = (bip32Params: BIP32Params): string => {
  const { purpose, coinType, accountNumber, isChange = false, index = 0 } = bip32Params
  if (typeof purpose === 'undefined') throw new Error('toPath: bip32Params.purpose is required')
  if (typeof coinType === 'undefined') throw new Error('toPath: bip32Params.coinType is required')
  if (typeof accountNumber === 'undefined')
    throw new Error('toPath: bip32Params.accountNumber is required')
  return `m/${purpose}'/${coinType}'/${accountNumber}'/${Number(isChange)}/${index}`
}

export const fromPath = (path: string): BIP32Params => {
  const parts = path.split('/')
  const sliced = parts.slice(1, parts.length - 1) // discard the m/
  if (sliced.length != 5) throw new Error(`fromPath: path only has ${sliced.length} parts`)
  const partsWithoutPrimes = sliced.map((part) => part.replace("'", '')) // discard harderning
  const [purpose, coinType, accountNumber, isChangeNumber, index] = partsWithoutPrimes.map(Number)
  const isChange = Boolean(isChangeNumber)
  return { purpose, coinType, accountNumber, isChange, index }
}
