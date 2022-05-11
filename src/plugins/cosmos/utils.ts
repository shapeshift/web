import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { chainAdapters, ChainTypes } from '@shapeshiftoss/types'

export type FeePriceValueHuman = {
  fiatFee: string
  txFee: string
  chainSpecific: chainAdapters.cosmos.FeeData
}
export type FeePrice = {
  [key in chainAdapters.FeeDataKey]: FeePriceValueHuman
}

export const getFormFees = (
  feeData: chainAdapters.FeeDataEstimate<ChainTypes.Cosmos>,
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
  return (Object.keys(feeData) as chainAdapters.FeeDataKey[]).reduce<FeePrice>(
    (acc: any, key: chainAdapters.FeeDataKey) => {
      const chainSpecific = feeData[key].chainSpecific
      const txFee = bnOrZero(feeData[key].txFee)
        .dividedBy(bnOrZero(`1e+${precision}`))
        .toPrecision()
      const fiatFee = bnOrZero(txFee).times(fiatRate).toPrecision()
      acc[key] = { txFee, fiatFee, chainSpecific }
      return acc
    },
    initialFees,
  )
}
