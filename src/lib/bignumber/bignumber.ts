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
  inputExponent = 0,
  outputExponent = 0,
}: {
  value: BigNumber.Value
  inputExponent?: number
  outputExponent?: number
}): BigNumber => {
  return bnOrZero(value)
    .dividedBy(bn(10).exponentiatedBy(inputExponent))
    .multipliedBy(bn(10).exponentiatedBy(outputExponent))
}

export const baseUnitToPrecision = ({
  value,
  inputExponent,
}: {
  value: BigNumber.Value
  inputExponent: number
}): BigNumber => convertPrecision({ value, inputExponent })

export const baseUnitToHuman = ({
  value,
  inputExponent,
}: {
  value: BigNumber.Value
  inputExponent: number
}) => {
  const precisionAmount = baseUnitToPrecision({ value, inputExponent })
  // trimming to 6 decimals is what we call "human amount"
  return precisionAmount.decimalPlaces(6)
}
