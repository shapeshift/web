import type { AccountId } from '@shapeshiftoss/caip'
import { tcyAssetId, thorchainChainId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useEffect, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'
import { toBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectMarketDataByFilter } from '@/state/slices/marketDataSlice/selectors'
import { useAppSelector } from '@/state/store'

export const StakeConfirm: React.FC<TCYRouteProps> = ({}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const { watch } = useFormContext<{ amount: string; accountId: AccountId }>()
  const amount = watch('amount')
  const accountId = watch('accountId')
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByFilter(state, { assetId: tcyAssetId }),
  )
  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const fiatAmount = useMemo(
    () =>
      bnOrZero(amount)
        .times(tcyMarketData?.price ?? 0)
        .toFixed(2),
    [amount, tcyMarketData],
  )

  const amountCryptoBaseUnit = useMemo(() => toBaseUnit(amount, THOR_PRECISION), [amount])

  const {
    executeTransaction,
    estimatedFeesData,
    isEstimatedFeesDataLoading,
    txId,
    isEstimatedFeesDataError,
  } = useSendThorTx({
    accountId,
    action: 'stakeTcy',
    amountCryptoBaseUnit,
    assetId: tcyAssetId,
    memo: 'tcy+',
    fromAddress: null,
  })

  useEffect(() => {
    if (txId) {
      navigate(TCYStakeRoute.Status)
    }
  }, [txId, navigate])

  const handleConfirm = useCallback(async () => {
    await executeTransaction()
  }, [executeTransaction])

  const handleCancel = useCallback(() => {
    navigate(TCYStakeRoute.Input)
  }, [navigate])

  const headerLeftComponent = useMemo(
    () => <DialogBackButton onClick={handleCancel} />,
    [handleCancel],
  )

  if (!tcyAsset) return null

  return (
    <ReusableConfirm
      assetId={tcyAssetId}
      headerText={translate('TCY.stakeConfirm.confirmTitle')}
      cryptoAmount={amount}
      cryptoSymbol={tcyAsset.symbol}
      fiatAmount={fiatAmount}
      feeAmountFiat={estimatedFeesData?.txFeeFiat}
      confirmText={translate('TCY.stakeConfirm.confirmAndStake')}
      onConfirm={handleConfirm}
      headerLeftComponent={headerLeftComponent}
      isDisabled={isEstimatedFeesDataLoading || isEstimatedFeesDataError}
      isLoading={isEstimatedFeesDataLoading}
    />
  )
}
