import { Alert, AlertIcon } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export type ShowUpdateStatusProps = {
  setting: string
}

export const ShowUpdateStatus = ({ setting }: ShowUpdateStatusProps) => {
  const translate = useTranslate()
  const { state } = useKeepKey()

  return state.updateStatus ? (
    <Alert
      status={state.updateStatus === 'success' ? 'success' : 'error'}
      borderRadius='lg'
      mb={3}
      fontWeight='semibold'
      color={state.updateStatus === 'success' ? 'green.200' : 'yellow.200'}
      fontSize='sm'
    >
      <AlertIcon color={state.updateStatus === 'success' ? 'green.200' : 'yellow.200'} />
      {state.updateStatus === 'success'
        ? translate('walletProvider.keepKey.settings.descriptions.updateSuccess', {
            setting: upperFirst(setting)
          })
        : translate('walletProvider.keepKey.settings.descriptions.updateFailed', {
            setting: setting
          })}
    </Alert>
  ) : null
}
