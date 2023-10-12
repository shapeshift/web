import assert from 'assert'
import axios from 'axios'

// do not export this to prevent misuse
const VERIFIED_HANDLE: unique symbol = Symbol('verifiedHandle')

export interface Verified<T> {
  [VERIFIED_HANDLE]: T
  unwrap: () => T
}

const TRM_LABS_API_URL = 'https://api.trmlabs.com/public/v1/sanctions/screening'

const cache: Record<string, Promise<boolean>> = {}

const _validateAddress = async (address: string): Promise<boolean> => {
  type trmResponse = [
    {
      address: string
      isSanctioned: boolean
    },
  ]

  const response = await axios.post<trmResponse>(
    TRM_LABS_API_URL,
    [
      {
        address,
      },
    ],
    {
      headers: {
        Accept: 'application/json',
      },
    },
  )

  return response.data[0].isSanctioned
}

const validateAddress = async (address: string): Promise<void> => {
  // dedupe and cache promises in memory
  if (cache[address] === undefined) {
    const newEntry = _validateAddress(address)
    cache[address] = newEntry
  }

  const result = cache[address]
  if (await result) throw Error('Address not supported')
}

// internal helper - do not expose externally to prevent accidental misuse
export const _internalWrap = <T>(value: T): Verified<T> => {
  return { [VERIFIED_HANDLE]: value, unwrap: () => value }
}

// internal helper - do not expose externally to prevent accidental misuse
export const _internalUnwrap = <T>(verifiedValue: Verified<T>): T => {
  return verifiedValue[VERIFIED_HANDLE]
}

// externally facing helper to allow manual verification of transaction data
export const verify = async <T>(addresses: string[], input: T): Promise<Verified<T>> => {
  assert(addresses.length > 0, 'cannot verify empty address list')
  await Promise.all(addresses.map(address => validateAddress(address)))
  return _internalWrap(input)
}
