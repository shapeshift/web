import { Flex, FormControl, FormLabel, Switch } from '@chakra-ui/react'
import * as Types from '@keepkey/device-protocol/lib/types_pb'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'

export const ChangePinCaching = () => {
  const translate = useTranslate()
  const { wallet, pinCaching, setPinCaching } = useKeepKeyWallet()

  const handleToggle = async () => {
    setPinCaching(!pinCaching)

    if (pinCaching !== undefined) {
      const newPinCachingPolicy: Required<Types.PolicyType.AsObject> = {
        policyName: 'Pin Caching',
        enabled: !pinCaching
      }
      await wallet?.applyPolicy(newPinCachingPolicy)
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
      <AwaitKeepKey setting={setting}>
        <FormControl display='flex' alignItems='center'>
          <FormLabel htmlFor='pin-caching' mb='0'>
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
