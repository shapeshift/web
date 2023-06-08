import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Flex,
  FormControl,
  FormLabel,
  Link,
  Spinner,
  Stack,
  Switch,
  useToast,
} from '@chakra-ui/react'
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
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()

  const handleToggle = async () => {
    const currentValue = !!hasPassphrase
    setHasPassphrase(!hasPassphrase)
    await keepKeyWallet?.applySettings({ usePassphrase: !currentValue }).catch(e => {
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
    setHasPassphrase(!hasPassphrase)
  }

  const setting = 'Passphrase'

  return (
    <SubMenuContainer>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.passphrase')}
        description={translate('walletProvider.keepKey.settings.descriptions.passphrase')}
        alert={translate('walletProvider.keepKey.settings.alerts.passphrase')}
      />
      <Alert status='warning' mx={3} width='auto' mb={3} fontSize='sm'>
        <AlertIcon />
        <Stack spacing={0}>
          <AlertTitle>
            {translate('walletProvider.keepKey.settings.alerts.passphrase.title')}
          </AlertTitle>
          <AlertDescription lineHeight='short'>
            {translate('walletProvider.keepKey.settings.alerts.passphrase.body')}
            <Link
              isExternal
              ml={1}
              href='https://vault12.com/securemycrypto/crypto-security-basics/what-is-a-passphrase/by-default-wallets-use-a-blank-passphrase'
            >
              {translate('walletProvider.keepKey.settings.alerts.passphrase.link')}
            </Link>
          </AlertDescription>
        </Stack>
      </Alert>
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
