import { useWatch } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'

import { TCYStakeRoute } from '../../types'
import { ReusableStatus } from '../ReusableStatus'
import type { StakeFormValues } from './Stake'

type StakeStatusProps = {
  txId: string
  setStakeTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const StakeStatus: React.FC<StakeStatusProps> = ({
  txId,
  setStakeTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const translate = useTranslate()
  const formValues = useWatch<StakeFormValues>()

  if (!formValues.amountCryptoPrecision || !formValues.accountId) {
    return null
  }

  return (
    <ReusableStatus
      txId={txId}
      setTxId={setStakeTxid}
      onTxConfirmed={handleTxConfirmed}
      initialRoute={TCYStakeRoute.Input}
      translationPrefix='stake'
      accountId={formValues.accountId}
      amountCryptoPrecision={formValues.amountCryptoPrecision}
      isDialog
      headerText={translate('TCY.stakeConfirm.confirmTitle')}
    />
  )
}
