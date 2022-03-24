import { Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'

export const ChangePin = () => {
  const translate = useTranslate()
  const { wallet } = useKeepKeyWallet()

  const handleChangePinInitializeEvent = async () => {
    await wallet?.changePin()
  }
  const setting = 'PIN'

  const renderPinState: JSX.Element = (() => {
    return (
      <>
        <ShowUpdateStatus setting={setting} />
        <AwaitKeepKey setting={setting}>
          <Button colorScheme='blue' size='sm' onClick={handleChangePinInitializeEvent}>
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
