import { FeeDataKey, NetworkTypes } from '@shapeshiftoss/types'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useGetAssetData } from 'hooks/useAsset/useAsset'
import { bnOrZero } from 'lib/bignumber/bignumber'

import { FeePrice } from '../../views/Confirm'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const getAssetData = useGetAssetData()
  const { asset, estimatedFees } = useWatch({
    control
  })
  const {
    state: { wallet }
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (wallet) {
        const assetData = await getAssetData({
          chain: asset?.chain,
          network: NetworkTypes.MAINNET
        })
        const txFees = (Object.keys(estimatedFees) as FeeDataKey[]).reduce(
          (acc: FeePrice, key: FeeDataKey) => {
            const current = estimatedFees[key]
            const fee = bnOrZero(current.networkFee).div(`1e${assetData.precision}`).toPrecision()
            const amount = bnOrZero(fee).times(bnOrZero(assetData.price)).toPrecision()
            acc[key] = { ...current, fee, amount }
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
