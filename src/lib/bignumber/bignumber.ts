import BigNumber from 'bignumber.js'

export * from 'bignumber.js'

export type BN = BigNumber

export const bn = (n: BigNumber.Value, base = 10): BN => new BigNumber(n, base)

export const bnOrZero = (n: BigNumber.Value | null | undefined, base = 10): BN => {
  const value = bn(n || 0, base)
  return value.isFinite() ? value : bn(0)
}

export const positiveOrZero = (n: BigNumber.Value | null | undefined): BN => {
  const value = bn(n || 0)
  return value.isPositive() ? value : bn(0)
}

export const convertPrecision = (
  value: BigNumber.Value,
  inputPrecision: number,
  outputPrecision: number,
): BigNumber => {
  return bnOrZero(value)
    .dividedBy(bn(10).exponentiatedBy(inputPrecision))
    .multipliedBy(bn(10).exponentiatedBy(outputPrecision))
}

export const toHuman = (value: BigNumber.Value, inputPrecision: number) =>
  convertPrecision(value, inputPrecision, 0)

export const fromHuman = (value: BigNumber.Value, outputPrecision: number) =>
  convertPrecision(value, 0, outputPrecision)
