import { Button, Flex, Input, useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

import type { AwaitKeepKeyProps } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { useDeviceSettingToast } from '@/components/Layout/Header/NavBar/KeepKey/hooks/useDeviceSettingToast'
import { SubmenuHeader } from '@/components/Layout/Header/NavBar/SubmenuHeader'
import { WalletActions } from '@/context/WalletProvider/actions'
import { useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { useWallet } from '@/hooks/useWallet/useWallet'

const setting = 'label'
const buttonPromptTranslation: AwaitKeepKeyProps['translation'] = [
  'walletProvider.keepKey.settings.descriptions.buttonPrompt',
  { setting },
]

export const ChangeLabel = () => {
  const { toastSuccess, toastError } = useDeviceSettingToast(setting)

  const translate = useTranslate()
  const { state, dispatch } = useWallet()
  const { walletInfo } = state
  const {
    state: { keepKeyWallet },
  } = useKeepKey()
  const {
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()
  const [keepKeyLabel, setKeepKeyLabel] = useState(walletInfo?.meta?.label ?? walletInfo?.name)

  const handleChangeLabelInitializeEvent = useCallback(async () => {
    if (!keepKeyWallet) return

    try {
      await keepKeyWallet.applySettings({ label: keepKeyLabel })
      // Nothing reads the label back from the device, so mirror it into wallet state
      if (keepKeyLabel) dispatch({ type: WalletActions.SET_WALLET_LABEL, payload: keepKeyLabel })
      toastSuccess()
    } catch (e) {
      toastError(e)
    }
  }, [dispatch, keepKeyLabel, keepKeyWallet, toastError, toastSuccess])

  const inputBackground = useColorModeValue('white', 'gray.800')
  const placeholderOpacity = useColorModeValue(0.6, 0.4)
  const inputPlaceholder = useMemo(
    () => ({ opacity: placeholderOpacity, color: 'inherit' }),
    [placeholderOpacity],
  )

  const handleLabelInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setKeepKeyLabel(e.target.value),
    [],
  )

  return (
    <SubMenuContainer>
      <Flex flexDir='column'>
        <SubmenuHeader
          title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
            setting: upperFirst(setting),
          })}
          description={translate('walletProvider.keepKey.settings.descriptions.label')}
        />
        <SubMenuBody>
          <Input
            type='text'
            placeholder={translate('walletProvider.keepKey.settings.placeholders.label')}
            _placeholder={inputPlaceholder}
            size='md'
            background={inputBackground}
            onChange={handleLabelInputChange}
            value={keepKeyLabel}
            autoFocus
            disabled={awaitingDeviceInteraction}
          />
          <Button
            isLoading={awaitingDeviceInteraction}
            colorScheme='blue'
            size='sm'
            onClick={handleChangeLabelInitializeEvent}
          >
            {translate('walletProvider.keepKey.settings.actions.update', {
              setting: upperFirst(setting),
            })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey translation={buttonPromptTranslation} />
      </Flex>
    </SubMenuContainer>
  )
}
