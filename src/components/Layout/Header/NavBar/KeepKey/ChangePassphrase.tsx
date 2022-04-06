import { Flex, FormControl, FormLabel, Spinner, Switch } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

export const ChangePassphrase = () => {
  const translate = useTranslate()
  const {
    keepKeyWallet,
    setHasPassphrase,
    state: { hasPassphrase }
  } = useKeepKey()
  const {
    state: { awaitingDeviceInteraction }
  } = useWallet()

  const handleToggle = async () => {
    setHasPassphrase(!hasPassphrase)
    await keepKeyWallet?.applySettings({ usePassphrase: hasPassphrase })
  }

  const onCancel = () => {
    setHasPassphrase(!hasPassphrase)
  }

  const setting = 'Passphrase'

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.passphrase')}
        description={translate('walletProvider.keepKey.settings.descriptions.passphrase')}
      />
      <ShowUpdateStatus setting={setting} />
      <FormControl display='flex' alignItems='center'>
        <Flex flexGrow={1}>
          <FormLabel htmlFor='pin-caching' mb='0'>
            {translate('walletProvider.keepKey.settings.actions.enable', {
              setting
            })}
          </FormLabel>
          {awaitingDeviceInteraction && <Spinner thickness='4px' />}
        </Flex>
        <Switch
          id='passphrase'
          isDisabled={awaitingDeviceInteraction}
          isChecked={hasPassphrase}
          onChange={handleToggle}
        />
      </FormControl>
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        onCancel={onCancel}
      />
    </Flex>
  )
}
