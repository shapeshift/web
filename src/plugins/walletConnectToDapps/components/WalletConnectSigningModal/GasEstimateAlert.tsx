import { Alert, AlertDescription, AlertIcon, AlertTitle, Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'

import type { GasEstimateFailure } from '@/plugins/walletConnectToDapps/utils'

const alertIcon = <AlertIcon />

type GasEstimateAlertProps = {
  failure: GasEstimateFailure | undefined
  isEstimateError: boolean
  hasGasLimit: boolean
}

export const GasEstimateAlert: FC<GasEstimateAlertProps> = ({
  failure,
  isEstimateError,
  hasGasLimit,
}) => {
  const translate = useTranslate()

  if (!failure && !(isEstimateError && !hasGasLimit)) return null

  const reason = (() => {
    if (failure?.type === 'insufficientFunds')
      return translate(
        'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.insufficientFunds',
      )
    if (failure?.reason)
      return translate('plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.reason', {
        reason: failure.reason,
      })
  })()

  return (
    <Alert status='warning' variant='subtle' borderRadius='lg' fontSize='sm'>
      {alertIcon}
      <Box>
        <AlertTitle>
          {translate(
            failure
              ? 'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.title'
              : 'plugins.walletConnectToDapps.modal.sendTransaction.gasEstimateUnavailable',
          )}
        </AlertTitle>
        <AlertDescription display='block'>
          {translate(
            hasGasLimit
              ? 'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.description'
              : 'plugins.walletConnectToDapps.modal.sendTransaction.setGasLimit',
          )}
        </AlertDescription>
        {reason && (
          <AlertDescription display='block' wordBreak='break-word'>
            {reason}
          </AlertDescription>
        )}
      </Box>
    </Alert>
  )
}
