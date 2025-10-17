import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useEffect, useMemo, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import type { SendInput } from '../../Form'
import type { FeePrice } from '../../views/Confirm'

import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn, bnOrZero } from '@/lib/bignumber/bignumber'
import { selectFeeAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useSendFees = () => {
  const [fees, setFees] = useState<FeePrice | null>(null)
  const { control } = useFormContext<SendInput>()
  const { assetId, estimatedFees, amountCryptoPrecision } = useWatch({
    control,
  }) as Partial<SendInput>
  if (!assetId) throw new Error(`AssetId not found: ${assetId}`)
  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))

  const {
    state: { wallet },
  } = useWallet()
  const marketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )

  const price = useMemo(() => marketDataUserCurrency?.price ?? 0, [marketDataUserCurrency])

  useEffect(() => {
    if (wallet && feeAsset && estimatedFees) {
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
          const txFee = bnOrZero(estimatedFees[key]?.txFee)
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
    // - when amountCryptoPrecision reference invalidates, since this wouldn't invalidate in the context of QR codes with amounts otherwise
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimatedFees, amountCryptoPrecision, assetId])

  return { fees }
}
