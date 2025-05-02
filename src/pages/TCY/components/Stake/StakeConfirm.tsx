import type { AccountId } from '@shapeshiftoss/caip'
import { tcyAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import type { TCYRouteProps } from '../../types'
import { TCYStakeRoute } from '../../types'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'
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

  const handleConfirm = useCallback(() => {
    navigate(TCYStakeRoute.Status)
  }, [navigate])

  const handleCancel = useCallback(() => {
    navigate(TCYStakeRoute.Input)
  }, [navigate])

  const headerLeftComponent = useMemo(
    () => <DialogBackButton onClick={handleCancel} />,
    [handleCancel],
  )

  return (
    <ReusableConfirm
      assetId={tcyAssetId}
      headerText={translate('TCY.stakeConfirm.confirmTitle')}
      cryptoAmount={amount}
      cryptoSymbol={tcyAsset?.symbol ?? 'TCY'}
      fiatAmount={fiatAmount}
      feeAmountFiat='0.00'
      confirmText={translate('TCY.stakeConfirm.confirmAndStake')}
      onConfirm={handleConfirm}
      headerLeftComponent={headerLeftComponent}
      isDisabled={false}
      isLoading={false}
    />
  )
}
