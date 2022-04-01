import { Alert, AlertIcon, useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export type ShowUpdateStatusProps = {
  setting: string
}

export const ShowUpdateStatus = ({ setting }: ShowUpdateStatusProps) => {
  const translate = useTranslate()
  const { state } = useKeepKey()
  const greenShade = useColorModeValue('green.700', 'green.200')
  const yellowShade = useColorModeValue('yellow.500', 'yellow.200')

  return state.updateStatus ? (
    <Alert
      status={state.updateStatus === 'success' ? 'success' : 'error'}
      borderRadius='lg'
      mb={3}
      fontWeight='semibold'
      color={state.updateStatus === 'success' ? greenShade : yellowShade}
      fontSize='sm'
    >
      <AlertIcon color={state.updateStatus === 'success' ? greenShade : yellowShade} />
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
