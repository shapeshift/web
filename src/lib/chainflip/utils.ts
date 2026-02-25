import type { Permill } from './types'

import { bnOrZero } from '@/lib/bignumber/bignumber'

const PERMILL_DIVISOR = 1_000_000

export const hexToBaseUnit = (hex: string): string => {
  try {
    return BigInt(hex).toString()
  } catch {
    return '0'
  }
}

export const baseUnitToPrecision = (baseUnit: string, precision: number): string =>
  bnOrZero(baseUnit).div(bnOrZero(10).pow(precision)).toFixed()

export const permillToDecimal = (permill: Permill): string =>
  bnOrZero(permill).div(PERMILL_DIVISOR).toFixed()
