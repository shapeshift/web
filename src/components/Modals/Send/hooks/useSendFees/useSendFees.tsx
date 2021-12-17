import { chainAdapters } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectAssetByCAIP19 } from 'state/slices/assetsSlice/assetsSlice'
import { selectMarketDataById } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppSelector } from 'state/store'

import { FeePrice } from '../../views/Confirm'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const { asset, estimatedFees } = useWatch({
    control
  })
  const feeAsset = useAppSelector(state => selectAssetByCAIP19(state, asset.caip19))
  const {
    state: { wallet }
  } = useWallet()

  const price = bnOrZero(useAppSelector(state => selectMarketDataById(state, asset.caip19)).price)

  useEffect(() => {
    if (wallet && asset && feeAsset) {
      const txFees = (Object.keys(estimatedFees) as chainAdapters.FeeDataKey[]).reduce(
        (acc: FeePrice, key: chainAdapters.FeeDataKey) => {
          const txFee = bnOrZero(estimatedFees[key].txFee)
            .dividedBy(bn(`1e+${feeAsset.precision}`))
            .toPrecision()
          const fiatFee = bnOrZero(txFee).times(price).toPrecision()
          acc[key] = { txFee, fiatFee }
          return acc
        },
        {} as FeePrice
      )
      setFees(txFees)
    }
    // We only want this effect to run on mount or when the estimatedFees in state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFees, asset.caip19])

  return { fees }
}
