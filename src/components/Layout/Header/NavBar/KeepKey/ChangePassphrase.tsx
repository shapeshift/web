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
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AwaitKeepKeyProps } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { WalletActions } from 'context/WalletProvider/actions'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectWalletId } from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

const setting = 'Passphrase'
const awaitKeepkeyButtonPromptTranslation: AwaitKeepKeyProps['translation'] = [
  'walletProvider.keepKey.settings.descriptions.buttonPrompt',
  { setting },
]

export const ChangePassphrase = () => {
  const appDispatch = useAppDispatch()
  const walletId = useAppSelector(selectWalletId)
  const translate = useTranslate()
  const toast = useToast()
  const {
    setHasPassphrase,
    state: { hasPassphrase, keepKeyWallet },
  } = useKeepKey()
  const {
    connect,
    dispatch,
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()

  const handleToggle = useCallback(async () => {
    if (!walletId || !keepKeyWallet) return

    const currentValue = !!hasPassphrase
    const newHasPassphrase = !hasPassphrase
    setHasPassphrase(newHasPassphrase)
    await keepKeyWallet?.applySettings({ usePassphrase: !currentValue }).catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
    // Clear all previous wallet meta
    appDispatch(portfolio.actions.clearWalletMetadata(walletId))
    // Trigger a refresh of the wallet metadata only once the settings have been applied
    // and the previous wallet meta is gone from the store
    dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
    connect(KeyManager.KeepKey, false)
  }, [
    appDispatch,
    connect,
    dispatch,
    hasPassphrase,
    keepKeyWallet,
    setHasPassphrase,
    toast,
    translate,
    walletId,
  ])

  const onCancel = useCallback(() => {
    setHasPassphrase(!hasPassphrase)
  }, [hasPassphrase, setHasPassphrase])

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
      <AwaitKeepKey translation={awaitKeepkeyButtonPromptTranslation} onCancel={onCancel} />
    </SubMenuContainer>
  )
}
