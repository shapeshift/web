import { Flex, FormControl, FormLabel, Switch } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export const ChangePassphrase = () => {
  const translate = useTranslate()
  const { keepKeyWallet, passphrase } = useKeepKey()

  const handleToggle = async () => {
    if (passphrase !== undefined) {
      await keepKeyWallet?.applySettings({ usePassphrase: !passphrase })
    } else return
  }
  const setting = 'Passphrase'

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.passphrase')}
        description={translate('walletProvider.keepKey.settings.descriptions.passphrase')}
      />
      <ShowUpdateStatus setting={setting} />
      <AwaitKeepKey setting={setting}>
        <FormControl display='flex' alignItems='center'>
          <FormLabel flexGrow={1} htmlFor='pin-caching' mb='0'>
            {translate('walletProvider.keepKey.settings.actions.enable', {
              setting
            })}
          </FormLabel>
          <Switch id='passphrase' isChecked={passphrase} onChange={handleToggle} />
        </FormControl>
      </AwaitKeepKey>
    </Flex>
  )
}
