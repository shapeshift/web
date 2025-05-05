import { useCallback, useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYUnstakeRoute } from '../../types'
import { ReusableStatus } from '../ReusableStatus'
import type { UnstakeFormValues } from './Unstake'

import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'

type UnstakeStatusProps = {
  txId: string
  setUnstakeTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const UnstakeStatus: React.FC<UnstakeStatusProps> = ({
  txId,
  setUnstakeTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const formValues = useWatch<UnstakeFormValues>()

  if (!formValues.amountCryptoPrecision || !formValues.accountId) {
    return null
  }

  return (
    <ReusableStatus
      txId={txId}
      setTxId={setUnstakeTxid}
      onTxConfirmed={handleTxConfirmed}
      initialRoute={TCYUnstakeRoute.Input}
      translationPrefix='unstake'
      accountId={formValues.accountId}
      amountCryptoPrecision={formValues.amountCryptoPrecision}
      headerText={translate('TCY.unstakeConfirm.confirmTitle')}
      isDialog
    />
  )
}
