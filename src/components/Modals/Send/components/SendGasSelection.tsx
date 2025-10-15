import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'

import type { SendInput } from '../Form'

import { GasSelection } from '@/components/GasSelection/GasSelection'
import { useSendFees } from '@/components/Modals/Send/hooks/useSendFees/useSendFees'
import { SendFormFields } from '@/components/Modals/Send/SendCommon'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectFeeAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const SendGasSelection: FC = () => {
  const { setValue, control } = useFormContext<SendInput>()
  const { fees } = useSendFees()
  const { feeType, assetId } = useWatch<SendInput>({
    control,
  }) as Partial<SendInput>

  const feeAsset = useAppSelector(state => selectFeeAssetById(state, assetId ?? ''))

  const feeAmountUserCurrency = useMemo(() => {
    const { fiatFee } = fees ? fees[feeType as FeeDataKey] : { fiatFee: 0 }
    return bnOrZero(fiatFee).toFixed(2)
  }, [fees, feeType])

  const cryptoAmountFee = useMemo(() => {
    const { txFee } = fees ? fees[feeType as FeeDataKey] : { txFee: 0 }
    return bnOrZero(txFee).toFixed()
  }, [fees, feeType])

  const selectedSpeed = feeType as FeeDataKey

  const handleSpeedChange = useCallback(
    (newSpeed: FeeDataKey) => {
      setValue(SendFormFields.FeeType, newSpeed)
    },
    [setValue],
  )

  return (
    <GasSelection
      selectedSpeed={selectedSpeed}
      onSpeedChange={handleSpeedChange}
      amountCryptoPrecision={cryptoAmountFee}
      feeAssetId={feeAsset?.assetId}
      fiatFee={feeAmountUserCurrency.toString()}
      isLoading={false}
    />
  )
}
