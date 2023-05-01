// Helper function to convert basis points to percentage
import { bnOrZero } from 'lib/bignumber/bignumber'

export const convertBasisPointsToPercentage = (basisPoints: string) =>
  bnOrZero(basisPoints).div(10000)
