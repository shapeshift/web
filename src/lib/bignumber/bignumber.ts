import BigNumber from 'bignumber.js'

export * from 'bignumber.js'

export type BN = BigNumber

export const bn = (n: BigNumber.Value, base = 10): BN => new BigNumber(n, base)

export const bnOrZero = (n: BigNumber.Value | null | undefined): BN => {
  const value = bn(n || 0)
  return value.isFinite() ? value : bn(0)
}

export const positiveOrZero = (n: BigNumber.Value | null | undefined): BN => {
  const value = bn(n || 0)
  return value.isPositive() ? value : bn(0)
}

export const convertPrecision = ({
  value,
  inputPrecision,
  outputPrecision,
}: {
  value: BigNumber.Value
  inputPrecision: number
  outputPrecision: number
}): BigNumber => {
  return bnOrZero(value)
    .dividedBy(bn(10).exponentiatedBy(inputPrecision))
    .multipliedBy(bn(10).exponentiatedBy(outputPrecision))
}

// copilot write JSDoc docs for this function

/**
 * Converts a BigNumber to a human readable amount
 * @example
 * toHuman({ value: '123456789', inputPrecision: 18 })
 * // => 0.123456
 * @example
 * toHuman({ value: '123456789', inputPrecision: 6 })
 * // => 1234.56789
 * @example
 * toHuman({ value: '123456789', inputPrecision: 0 })
 * // => 123456789
 */
export const toHuman = ({
  value,
  inputPrecision,
}: {
  value: BigNumber.Value
  inputPrecision: number
}) => {
  const precisionAmount = convertPrecision({ value, inputPrecision, outputPrecision: 0 })
  // trimming to 6 decimals is what we call "human amount"
  return precisionAmount.decimalPlaces(6)
}

export const fromHuman = ({
  value,
  outputPrecision,
}: {
  value: BigNumber.Value
  outputPrecision: number
}) => convertPrecision({ value, inputPrecision: 0, outputPrecision })
