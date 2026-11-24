import { Alert, AlertDescription, AlertIcon, AlertTitle, Box } from '@chakra-ui/react'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'

import { getGasEstimateFailure } from '@/plugins/walletConnectToDapps/utils'

const alertIcon = <AlertIcon />

type GasEstimateAlertProps = {
  error: unknown
  hasGasLimit: boolean
}

export const GasEstimateAlert: FC<GasEstimateAlertProps> = ({ error, hasGasLimit }) => {
  const translate = useTranslate()

  if (!error) return null

  const failure = getGasEstimateFailure(error)
  if (!failure && hasGasLimit) return null

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
        {failure?.type === 'insufficientFunds' && (
          <AlertDescription display='block'>
            {translate(
              'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.insufficientFunds',
            )}
          </AlertDescription>
        )}
        {failure?.type === 'revert' && failure.reason && (
          <AlertDescription display='block' wordBreak='break-word'>
            {translate('plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.reason', {
              reason: failure.reason,
            })}
          </AlertDescription>
        )}
      </Box>
    </Alert>
  )
}
