import type { BigNumber } from 'lib/bignumber/bignumber'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

export function convertPrecision(
  value: BigNumber.Value,
  inputPrecision: number,
  outputPrecision: number,
): BigNumber {
  return bnOrZero(value)
    .dividedBy(bn(10).exponentiatedBy(inputPrecision))
    .times(bn(10).exponentiatedBy(outputPrecision))
    .integerValue()
}
