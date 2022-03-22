import { InfoIcon } from '@chakra-ui/icons'
import { Alert, AlertIcon, Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from 'components/Text'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'

export const ChangePin = () => {
  const translate = useTranslate()
  const { awaitingButtonPress, setAwaitingButtonPress, keepKeyUpdateStatus, handleKeepKeyEvents } =
    useKeepKeyMenuEventHandler()
  const { wallet } = useKeepKeyWallet()

  const handleChangePinInitializeEvent = async () => {
    handleKeepKeyEvents()
    setAwaitingButtonPress(true)
    await wallet?.changePin()
  }

  const renderPinState: JSX.Element = (() => {
    return (
      <>
        {keepKeyUpdateStatus && (
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
                  setting: 'PIN'
                })
              : translate('walletProvider.keepKey.settings.descriptions.updateFailed', {
                  setting: 'PIN'
                })}
          </Alert>
        )}
        {awaitingButtonPress ? (
          <Flex>
            <InfoIcon color='blue.200' mt={1} />
            <Text
              translation={[
                'walletProvider.keepKey.settings.descriptions.buttonPrompt',
                { setting: 'PIN' }
              ]}
              ml={3}
              fontWeight='medium'
              color='blue.200'
            />
          </Flex>
        ) : (
          <Button colorScheme='blue' size='sm' onClick={handleChangePinInitializeEvent}>
            {translate('walletProvider.keepKey.settings.actions.update', { setting: 'PIN' })}
          </Button>
        )}
      </>
    )
  })()

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: 'PIN'
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.pin')}
      />
      {renderPinState}
    </Flex>
  )
}
