import { cosmos, FeeDataEstimate, FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { KnownChainIds } from '@shapeshiftoss/types'
import { bnOrZero } from 'lib/bignumber/bignumber'

export type FeePriceValueHuman = {
  fiatFee: string
  txFee: string
  chainSpecific: cosmos.FeeData
}
export type FeePrice = {
  [key in FeeDataKey]: FeePriceValueHuman
}

export const getFormFees = (
  feeData: FeeDataEstimate<KnownChainIds.CosmosMainnet>,
  precision: number,
  fiatRate: string,
) => {
  const initialFees = {
    slow: {
      fiatFee: '',
      txFee: '',
      chainSpecific: {
        gasLimit: '',
      },
    },
    average: {
      fiatFee: '',
      txFee: '',
      chainSpecific: {
        gasLimit: '',
      },
    },
    fast: {
      fiatFee: '',
      txFee: '',
      chainSpecific: {
        gasLimit: '',
      },
    },
  }
  return (Object.keys(feeData) as FeeDataKey[]).reduce<FeePrice>((acc: any, key: FeeDataKey) => {
    const chainSpecific = feeData[key].chainSpecific
    const txFee = bnOrZero(feeData[key].txFee)
      .dividedBy(bnOrZero(`1e+${precision}`))
      .toPrecision()
    const fiatFee = bnOrZero(txFee).times(fiatRate).toPrecision()
    acc[key] = { txFee, fiatFee, chainSpecific }
    return acc
  }, initialFees)
}
