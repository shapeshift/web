import { bn, bnOrZero } from 'lib/bignumber/bignumber'

export function convertPrecision(
  value: string,
  inputPrecision: number,
  outputPrecision: number,
): string {
  return bnOrZero(value)
    .dividedBy(bn(10).exponentiatedBy(inputPrecision))
    .times(bn(10).exponentiatedBy(outputPrecision))
    .toString()
}
