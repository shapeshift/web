import { chainAdapters } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { FeePrice } from '../../views/Confirm'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const { asset, estimatedFees } = useWatch({
    control
  })
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, asset.caip19))
  const {
    state: { wallet }
  } = useWallet()

  const price = bnOrZero(
    useAppSelector(state => selectMarketDataById(state, feeAsset.caip19)).price
  )

  useEffect(() => {
    if (wallet && asset && feeAsset && estimatedFees) {
      const initialFees: FeePrice = {
        slow: {
          fiatFee: '',
          txFee: ''
        },
        average: {
          fiatFee: '',
          txFee: ''
        },
        fast: {
          fiatFee: '',
          txFee: ''
        }
      }
      const txFees = (Object.keys(estimatedFees) as chainAdapters.FeeDataKey[]).reduce<FeePrice>(
        (acc: FeePrice, key: chainAdapters.FeeDataKey) => {
          const txFee = bnOrZero(estimatedFees[key].txFee)
            .dividedBy(bn(`1e+${feeAsset.precision}`))
            .toPrecision()
          const fiatFee = bnOrZero(txFee).times(price).toPrecision()
          acc[key] = { txFee, fiatFee }
          return acc
        },
        initialFees
      )
      setFees(txFees)
    }
    // We only want this effect to run on mount or when the estimatedFees in state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFees, asset.caip19])

  return { fees }
}
