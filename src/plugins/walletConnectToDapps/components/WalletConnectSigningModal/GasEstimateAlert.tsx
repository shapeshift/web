import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, VStack } from '@chakra-ui/react'
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
    <Alert
      status='warning'
      variant='subtle'
      borderRadius='lg'
      fontSize='sm'
      alignItems='flex-start'
    >
      {alertIcon}
      <VStack align='start' spacing={2}>
        <Box>
          <AlertTitle display='block'>
            {translate(
              failure
                ? 'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.title'
                : 'plugins.walletConnectToDapps.modal.sendTransaction.gasEstimateUnavailable',
            )}
          </AlertTitle>
          {!hasGasLimit && (
            <AlertDescription display='block'>
              {translate('plugins.walletConnectToDapps.modal.sendTransaction.setGasLimit')}
            </AlertDescription>
          )}
          {hasGasLimit && failure?.type === 'revert' && (
            <AlertDescription display='block'>
              {translate(
                'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.description',
              )}
            </AlertDescription>
          )}
        </Box>
        {failure?.type === 'insufficientFunds' && (
          <AlertDescription display='block' fontSize='xs' color='text.subtle'>
            {translate(
              'plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.insufficientFunds',
            )}
          </AlertDescription>
        )}
        {failure?.type === 'revert' && failure.reason && (
          <AlertDescription
            display='block'
            fontSize='xs'
            color='text.subtle'
            wordBreak='break-word'
          >
            {translate('plugins.walletConnectToDapps.modal.sendTransaction.likelyToFail.reason', {
              reason: failure.reason,
            })}
          </AlertDescription>
        )}
      </VStack>
    </Alert>
  )
}
