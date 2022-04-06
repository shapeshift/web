import { Flex, FormControl, FormLabel, Spinner, Switch } from '@chakra-ui/react'
import * as Types from '@keepkey/device-protocol/lib/types_pb'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

export const ChangePinCaching = () => {
  const translate = useTranslate()
  const {
    keepKeyWallet,
    setHasPinCaching,
    state: { hasPinCaching }
  } = useKeepKey()
  const {
    state: { awaitingDeviceInteraction }
  } = useWallet()

  const handleToggle = async () => {
    setHasPinCaching(!hasPinCaching)
    const newPinCachingPolicy: Required<Types.PolicyType.AsObject> = {
      policyName: 'Pin Caching',
      enabled: hasPinCaching || false
    }
    await keepKeyWallet?.applyPolicy(newPinCachingPolicy)
  }

  const onCancel = () => {
    setHasPinCaching(!hasPinCaching)
  }

  const setting = 'PIN caching'

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.pinCaching')}
        description={translate('walletProvider.keepKey.settings.descriptions.pinCaching')}
      />
      <LastDeviceInteractionStatus setting={setting} />
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
          id='pin-caching'
          isDisabled={awaitingDeviceInteraction}
          isChecked={hasPinCaching}
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
