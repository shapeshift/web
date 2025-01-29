import { Button, Flex, Input, useColorModeValue, useToast } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import type { AwaitKeepKeyProps } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

export const ChangeLabel = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { state } = useWallet()
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
    await keepKeyWallet?.applySettings({ label: keepKeyLabel }).catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }, [keepKeyLabel, keepKeyWallet, toast, translate])

  const setting = 'label'
  const inputBackground = useColorModeValue('white', 'gray.800')
  const placeholderOpacity = useColorModeValue(0.6, 0.4)
  const inputPlaceholder = useMemo(
    () => ({ opacity: placeholderOpacity, color: 'inherit' }),
    [placeholderOpacity],
  )

  const buttonPromptTranslation: AwaitKeepKeyProps['translation'] = useMemo(
    () => ['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }],
    [setting],
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
            setting,
          })}
          description={translate('walletProvider.keepKey.settings.descriptions.label')}
        />
        <SubMenuBody>
          <LastDeviceInteractionStatus setting={setting} />
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
            {translate('walletProvider.keepKey.settings.actions.update', { setting })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey translation={buttonPromptTranslation} />
      </Flex>
    </SubMenuContainer>
  )
}
