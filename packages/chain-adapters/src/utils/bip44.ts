import { addressNListToBIP32, bip32ToAddressNList } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params } from '@shapeshiftoss/types'

export const toRootDerivationPath = (bip44Params: Bip44Params): string => {
  const { purpose, coinType, accountNumber } = bip44Params

  if (typeof purpose === 'undefined') throw new Error('purpose is required')
  if (typeof coinType === 'undefined') throw new Error('coinType is required')
  if (typeof accountNumber === 'undefined') throw new Error('accountNumber is required')

  return `m/${purpose}'/${coinType}'/${accountNumber}'`
}

export const toPath = (bip44Params: Bip44Params): string => {
  const { isChange, addressIndex } = bip44Params

  let path = toRootDerivationPath(bip44Params)
  if (isChange !== undefined) {
    path = path.concat(`/${Number(isChange)}`)
    if (addressIndex !== undefined) path = path.concat(`/${addressIndex}`)
  }

  return path
}

export const fromPath = (path: string): Bip44Params => {
  const parts = path.split('/').slice(1) // discard the m/

  if (parts.length < 3 || parts.length > 5) {
    throw new Error(`path has ${parts.length} parts, expected 3 to 5`)
  }

  const [purpose, coinType, accountNumber, change, addressIndex] = parts.map(
    part => Number(part.replace("'", '')), // remove hardening and convert to number
  ) as [number, number, number, number?, number?]

  const isChange = change !== undefined ? Boolean(change) : undefined

  return { purpose, coinType, accountNumber, isChange, addressIndex }
}

export const toAddressNList = (bip44Params: Bip44Params): number[] => {
  return bip32ToAddressNList(toPath(bip44Params))
}

export const fromAddressNList = (addressNList: number[]): Bip44Params => {
  return fromPath(addressNListToBIP32(addressNList))
}
