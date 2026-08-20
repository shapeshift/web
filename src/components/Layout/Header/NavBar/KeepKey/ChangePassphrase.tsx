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
} from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useCallback, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

import type { AwaitKeepKeyProps } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { useDeviceSettingToast } from '@/components/Layout/Header/NavBar/KeepKey/hooks/useDeviceSettingToast'
import { SubmenuHeader } from '@/components/Layout/Header/NavBar/SubmenuHeader'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import { selectWalletId } from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const setting = 'passphrase'
const awaitKeepkeyButtonPromptTranslation: AwaitKeepKeyProps['translation'] = [
  'walletProvider.keepKey.settings.descriptions.buttonPrompt',
  { setting },
]

export const ChangePassphrase = () => {
  const { toastSuccess, toastError } = useDeviceSettingToast(setting)
  // The switch only moves once the device confirms, so nothing else stops a second click
  const [isSubmitting, setIsSubmitting] = useState(false)

  const appDispatch = useAppDispatch()
  const walletId = useAppSelector(selectWalletId)
  const translate = useTranslate()
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
    if (!walletId || !keepKeyWallet || isSubmitting) return

    setIsSubmitting(true)

    const currentValue = !!hasPassphrase
    const newHasPassphrase = !hasPassphrase

    try {
      await keepKeyWallet.applySettings({ usePassphrase: !currentValue })
      // Writing this before the device confirms would show a setting it never applied
      setHasPassphrase(newHasPassphrase)
      // Nothing is stored, so "updated" would imply a passphrase we now hold
      toastSuccess(
        translate(
          newHasPassphrase
            ? 'walletProvider.keepKey.settings.descriptions.passphraseEnabled'
            : 'walletProvider.keepKey.settings.descriptions.passphraseDisabled',
        ),
      )
    } catch (e) {
      toastError(e)
      return
    } finally {
      setIsSubmitting(false)
    }
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
    isSubmitting,
    keepKeyWallet,
    setHasPassphrase,
    toastError,
    toastSuccess,
    translate,
    walletId,
  ])

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
      <SubMenuBody>
        <FormControl display='flex' alignItems='center'>
          <Flex flexGrow={1}>
            <FormLabel htmlFor='pin-caching' mb='0'>
              {translate('walletProvider.keepKey.settings.actions.enable', {
                setting: upperFirst(setting),
              })}
            </FormLabel>
            {(awaitingDeviceInteraction || isSubmitting) && <Spinner thickness='4px' />}
          </Flex>
          <Switch
            id='passphrase'
            isDisabled={awaitingDeviceInteraction || isSubmitting}
            isChecked={hasPassphrase}
            onChange={handleToggle}
          />
        </FormControl>
      </SubMenuBody>
      <AwaitKeepKey translation={awaitKeepkeyButtonPromptTranslation} />
    </SubMenuContainer>
  )
}
