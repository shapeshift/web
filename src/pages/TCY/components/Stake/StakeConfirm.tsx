import { tcyAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYStakeRoute } from '../../types'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'

export const StakeConfirm = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

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
      cryptoAmount='100'
      cryptoSymbol='TCY'
      fiatAmount='100'
      feeAmountFiat='0.00'
      confirmText={translate('TCY.stakeConfirm.confirmAndStake')}
      onConfirm={handleConfirm}
      headerLeftComponent={headerLeftComponent}
      isDisabled={false}
      isLoading={false}
    />
  )
}
