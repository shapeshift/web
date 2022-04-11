import { Flex, FormControl, FormLabel, Spinner, Switch } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import * as Types from '@keepkey/device-protocol/lib/types_pb'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

export const ChangePinCaching = () => {
  const translate = useTranslate()
  const {
    keepKeyWallet,
    setHasPinCaching,
    state: { hasPinCaching },
  } = useKeepKey()
  const {
    state: { awaitingDeviceInteraction },
  } = useWallet()
  const toast = useToast()

  const handleToggle = async () => {
    const currentValue = !!hasPinCaching
    setHasPinCaching(!hasPinCaching)
    const newPinCachingPolicy: Required<Types.PolicyType.AsObject> = {
      policyName: 'Pin Caching',
      enabled: !currentValue,
    }
    await keepKeyWallet?.applyPolicy(newPinCachingPolicy).catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }

  const onCancel = () => {
    setHasPinCaching(!hasPinCaching)
  }

  const setting = 'PIN caching'

  return (
    <SubMenuContainer>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.pinCaching')}
        description={translate('walletProvider.keepKey.settings.descriptions.pinCaching')}
      />
      <SubMenuBody>
        <LastDeviceInteractionStatus setting={setting} />
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
            id='pin-caching'
            isDisabled={awaitingDeviceInteraction}
            isChecked={hasPinCaching}
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
