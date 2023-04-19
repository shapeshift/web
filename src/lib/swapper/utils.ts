import { AssertionError } from 'assert'
import type { ISetupCache } from 'axios-cache-adapter'
import { setupCache } from 'axios-cache-adapter'
import { BigNumber, bnOrZero } from 'lib/bignumber/bignumber'

// asserts x is type doesn't work when using arrow functions
export function assertIsDefined<T>(val: T): asserts val is NonNullable<T> {
  if (val === undefined || val === null) {
    throw new AssertionError({ message: `Expected 'val' to be defined, but received ${val}` })
  }
}

const getRequestFilter = (cachedUrls: string[]) => (request: Request) =>
  !cachedUrls.some(url => request.url.includes(url))

export const createCache = (maxAge: number, cachedUrls: string[]): ISetupCache => {
  const filter = getRequestFilter(cachedUrls)
  return setupCache({
    maxAge,
    exclude: { filter, query: false },
    clearOnStale: true,
    readOnError: false,
    readHeaders: false,
  })
}

// TODO: replace this with lib/bignumber/bignumber fromBaseUnit
// requries validating use of `toFixed` in new implementation
export const fromBaseUnit = (
  value: BigNumber.Value,
  decimals: number,
  displayDecimals = 6,
): string => {
  return bnOrZero(value)
    .div(`1e+${decimals}`)
    .decimalPlaces(displayDecimals, BigNumber.ROUND_DOWN)
    .toString()
}
