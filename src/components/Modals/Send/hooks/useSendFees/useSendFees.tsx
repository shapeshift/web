import { fromAssetId } from '@shapeshiftoss/caip'
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { selectFeeAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { FeePrice } from '../../views/Confirm'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext()
  const { assetId, estimatedFees, cryptoAmount } = useWatch({
    control,
  })
  const feeAssetId = getChainAdapterManager().get(fromAssetId(assetId).chainId)?.getFeeAssetId()
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, feeAssetId ?? ''))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${assetId}`)

  const asset = useAppSelector(state => selectFeeAssetById(state, assetId))
  if (!asset) throw new Error(`Asset not found for AssetId ${assetId}`)
  const {
    state: { wallet },
  } = useWallet()

  const price = bnOrZero(
    useAppSelector(state => selectMarketDataById(state, feeAsset.assetId)).price,
  )

  useEffect(() => {
    if (wallet && asset && feeAsset && estimatedFees) {
      const initialFees: FeePrice = {
        slow: {
          fiatFee: '',
          txFee: '',
        },
        average: {
          fiatFee: '',
          txFee: '',
        },
        fast: {
          fiatFee: '',
          txFee: '',
        },
      }
      const txFees = (Object.keys(estimatedFees) as FeeDataKey[]).reduce<FeePrice>(
        (acc: FeePrice, key: FeeDataKey) => {
          const txFee = bnOrZero(estimatedFees[key].txFee)
            .dividedBy(bn(`1e+${feeAsset.precision}`))
            .toPrecision()
          const fiatFee = bnOrZero(txFee).times(price).toPrecision()
          acc[key] = { txFee, fiatFee }
          return acc
        },
        initialFees,
      )
      setFees(txFees)
    }
    // We only want this effect to run on
    // - mount
    // - when the estimatedFees reference invalidates
    // - when cryptoAmount reference invalidates, since this wouldn't invalidate in the context of QR codes with amounts otherwise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFees, cryptoAmount, assetId])

  return { fees }
}
