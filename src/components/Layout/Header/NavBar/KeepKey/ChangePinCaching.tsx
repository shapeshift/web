import { Flex, FormControl, FormLabel, Switch } from '@chakra-ui/react'
import * as Types from '@keepkey/device-protocol/lib/types_pb'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export const ChangePinCaching = () => {
  const translate = useTranslate()
  const { keepKeyWallet, pinCaching } = useKeepKey()

  const handleToggle = async () => {
    if (pinCaching !== undefined) {
      const newPinCachingPolicy: Required<Types.PolicyType.AsObject> = {
        policyName: 'Pin Caching',
        enabled: !pinCaching
      }
      await keepKeyWallet?.applyPolicy(newPinCachingPolicy)
    } else return
  }
  const setting = 'PIN caching'

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.pinCaching')}
        description={translate('walletProvider.keepKey.settings.descriptions.pinCaching')}
      />
      <ShowUpdateStatus setting={setting} />
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
      >
        <FormControl display='flex' alignItems='center'>
          <FormLabel flexGrow={1} htmlFor='pin-caching' mb='0'>
            {translate('walletProvider.keepKey.settings.actions.enable', {
              setting
            })}
          </FormLabel>
          <Switch id='pin-caching' isChecked={pinCaching} onChange={handleToggle} />
        </FormControl>
      </AwaitKeepKey>
    </Flex>
  )
}
