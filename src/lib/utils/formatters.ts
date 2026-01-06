import { bnOrZero } from '@/lib/bignumber/bignumber'

export const formatLargeNumber = (value: number | string, currency = '', decimals = 2): string => {
  const num = bnOrZero(value).toNumber()
  const prefix = currency ? `${currency}` : ''

  if (num >= 1e12) return `${prefix}${(num / 1e12).toFixed(decimals)}T`
  if (num >= 1e9) return `${prefix}${(num / 1e9).toFixed(decimals)}B`
  if (num >= 1e6) return `${prefix}${(num / 1e6).toFixed(decimals)}M`
  if (num >= 1e3) return `${prefix}${(num / 1e3).toFixed(decimals)}K`

  return `${prefix}${num.toFixed(decimals)}`
}

export const formatPercentage = (value: number | string, decimals = 2): string => {
  return `${bnOrZero(value).times(100).toFixed(decimals)}%`
}
