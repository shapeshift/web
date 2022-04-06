import { Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export const ChangePin = () => {
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()

  const handleChangePin = async () => {
    await keepKeyWallet?.changePin()
  }
  const setting = 'PIN'

  const renderPinState: JSX.Element = (() => {
    return (
      <>
        <LastDeviceInteractionStatus setting={setting} />
        <AwaitKeepKey
          translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        >
          <Button colorScheme='blue' size='sm' onClick={handleChangePin}>
            {translate('walletProvider.keepKey.settings.actions.update', { setting })}
          </Button>
        </AwaitKeepKey>
      </>
    )
  })()

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.pin')}
      />
      {renderPinState}
    </Flex>
  )
}
