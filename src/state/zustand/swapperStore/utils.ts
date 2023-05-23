// Helper function to convert basis points to percentage
import { bnOrZero } from 'lib/bignumber/bignumber'

export const convertBasisPointsToDecimalPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(10000)

export const convertBasisPointsToPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(100)
