import { ethAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYStakeRoute, TCYUnstakeRoute } from '../../types'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'

export const UnstakeConfirm = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleConfirm = useCallback(() => {
    navigate(TCYUnstakeRoute.Status)
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
      assetId={ethAssetId}
      headerText={translate('TCY.unstakeConfirm.confirmTitle')}
      cryptoAmount='100'
      cryptoSymbol='TCY'
      fiatAmount='100'
      feeAmountFiat='0.00'
      confirmText={translate('TCY.unstakeConfirm.confirmAndUnstake')}
      onConfirm={handleConfirm}
      headerLeftComponent={headerLeftComponent}
    />
  )
}
