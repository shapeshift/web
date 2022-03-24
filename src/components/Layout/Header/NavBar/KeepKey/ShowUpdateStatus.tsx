import { Alert, AlertIcon } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'

export const ShowUpdateStatus = ({ setting }: { setting: string }) => {
  const translate = useTranslate()
  const { handleKeepKeyEvents, keepKeyUpdateStatus } = useKeepKeyMenuEventHandler()

  handleKeepKeyEvents()
  return keepKeyUpdateStatus ? (
    <Alert
      status={keepKeyUpdateStatus === 'success' ? 'success' : 'error'}
      borderRadius='lg'
      mb={3}
      fontWeight='semibold'
      color={keepKeyUpdateStatus === 'success' ? 'green.200' : 'yellow.200'}
      fontSize='sm'
    >
      <AlertIcon color={keepKeyUpdateStatus === 'success' ? 'green.200' : 'yellow.200'} />
      {keepKeyUpdateStatus === 'success'
        ? translate('walletProvider.keepKey.settings.descriptions.updateSuccess', {
            setting: upperFirst(setting)
          })
        : translate('walletProvider.keepKey.settings.descriptions.updateFailed', {
            setting: setting
          })}
    </Alert>
  ) : null
}
