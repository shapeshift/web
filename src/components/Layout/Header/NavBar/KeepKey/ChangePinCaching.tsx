import { InfoIcon } from '@chakra-ui/icons'
import { Flex, FormControl, FormLabel, Switch } from '@chakra-ui/react'
import * as Types from '@keepkey/device-protocol/lib/types_pb'
import { useTranslate } from 'react-polyglot'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from 'components/Text'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'

export const ChangePinCaching = () => {
  const translate = useTranslate()
  const { awaitingButtonPress, setAwaitingButtonPress, handleKeepKeyEvents } =
    useKeepKeyMenuEventHandler()
  const { wallet, pinCaching, setPinCaching } = useKeepKeyWallet()

  const handleToggle = async () => {
    setPinCaching(!pinCaching)
    handleKeepKeyEvents()
    setAwaitingButtonPress(true)

    if (pinCaching !== undefined) {
      const newPinCachingPolicy: Required<Types.PolicyType.AsObject> = {
        policyName: 'Pin Caching',
        enabled: !pinCaching
      }
      await wallet?.applyPolicy(newPinCachingPolicy)
    } else return
  }

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.pinCaching')}
        description={translate('walletProvider.keepKey.settings.descriptions.pinCaching')}
      />
      <ShowUpdateStatus setting='PIN caching' />
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
        <FormControl display='flex' alignItems='center'>
          <FormLabel htmlFor='pin-caching' mb='0'>
            {translate('walletProvider.keepKey.settings.actions.enable', {
              setting: 'PIN caching'
            })}
          </FormLabel>
          <Switch id='pin-caching' isChecked={pinCaching} onChange={handleToggle} />
        </FormControl>
      )}
    </Flex>
  )
}
