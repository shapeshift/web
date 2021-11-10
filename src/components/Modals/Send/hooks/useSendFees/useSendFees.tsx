import { chainAdapters } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'

import { FeePrice } from '../../views/Confirm'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const { asset, estimatedFees } = useWatch({
    control
  })
  const getAssetData = useGetAssetData({ chain: asset?.chain })
  const {
    state: { wallet }
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (wallet) {
        const marketData = await getAssetData({
          chain: asset?.chain
        })
        const txFees = (Object.keys(estimatedFees) as chainAdapters.FeeDataKey[]).reduce(
          (acc: FeePrice, key: chainAdapters.FeeDataKey) => {
            const txFee = bnOrZero(estimatedFees[key].txFee)
              .dividedBy(bn(10).exponentiatedBy(asset.precision))
              .toPrecision()
            const fiatFee = bnOrZero(txFee).times(bnOrZero(marketData?.price)).toPrecision()
            acc[key] = { txFee, fiatFee }
            return acc
          },
          {} as FeePrice
        )
        setFees(txFees)
      }
    })()
    // We only want this effect to run on mount or when the estimatedFees in state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFees])

  return { fees }
}
