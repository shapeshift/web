import { bn, bnOrZero } from 'lib/bignumber/bignumber'

export function calculateSlippageMargin(amount: string | null, precision: number) {
  if (!amount) throw new Error('Amount not given for slippage')
  const percentage = '0.5'
  const remainingPercentage = bn(100).minus(percentage).div(100).toString()
  return bnOrZero(amount)
    .times(bn(10).exponentiatedBy(precision))
    .times(bnOrZero(remainingPercentage))
    .decimalPlaces(0)
    .toFixed()
}
