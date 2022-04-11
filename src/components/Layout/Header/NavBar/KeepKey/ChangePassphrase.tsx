import { Flex, FormControl, FormLabel, Spinner, Switch } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

export const ChangePassphrase = () => {
  const translate = useTranslate()
  const toast = useToast()
  const {
    keepKeyWallet,
    setHasPassphrase,
    state: { hasPassphrase },
  } = useKeepKey()
  const {
    state: { awaitingDeviceInteraction },
  } = useWallet()

  const handleToggle = async () => {
    const currentValue = !!hasPassphrase
    setHasPassphrase(!hasPassphrase)
    await keepKeyWallet?.applySettings({ usePassphrase: !currentValue }).catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e.message,
        status: 'error',
        isClosable: true,
      })
    })
  }

  const onCancel = () => {
    setHasPassphrase(!hasPassphrase)
  }

  const setting = 'Passphrase'

  return (
    <SubMenuContainer>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.passphrase')}
        description={translate('walletProvider.keepKey.settings.descriptions.passphrase')}
      />
      <LastDeviceInteractionStatus setting={setting} />
      <SubMenuBody>
        <FormControl display='flex' alignItems='center'>
          <Flex flexGrow={1}>
            <FormLabel htmlFor='pin-caching' mb='0'>
              {translate('walletProvider.keepKey.settings.actions.enable', {
                setting,
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
      </SubMenuBody>
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        onCancel={onCancel}
      />
    </SubMenuContainer>
  )
}
