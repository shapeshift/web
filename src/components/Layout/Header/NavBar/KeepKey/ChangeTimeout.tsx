import { useColorModeValue } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

import type { AwaitKeepKeyProps } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from '@/components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from '@/components/Layout/Header/NavBar/SubmenuHeader'
import { Radio } from '@/components/Radio/Radio'
import { DeviceTimeout, timeoutOptions, useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

const radioProps = { width: 'full', justifyContent: 'flex-start' }
const radioButtonGroupProps = {
  display: 'flex',
  flexDirection: 'column',
  width: 'full',
  alignItems: 'flex-start',
  flex: 1,
  spacing: '0',
} as const

export const ChangeTimeout = () => {
  const translate = useTranslate()
  const {
    state: { deviceTimeout, keepKeyWallet },
  } = useKeepKey()
  const {
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const [radioTimeout, setRadioTimeout] = useState<DeviceTimeout>()

  const handleChange = useCallback(
    async (value: DeviceTimeout) => {
      const parsedTimeout = value ? parseInt(value) : parseInt(DeviceTimeout.TenMinutes)

      value && setRadioTimeout(value)
      await keepKeyWallet?.applySettings({ autoLockDelayMs: parsedTimeout }).catch(e => {
        console.error(e)
        toast({
          title: translate('common.error'),
          description: e?.message ?? translate('common.somethingWentWrong'),
          status: 'error',
          isClosable: true,
        })
      })
    },
    [keepKeyWallet, toast, translate],
  )

  const setting = 'timeout'
  const colorScheme = useColorModeValue('blackAlpha', 'white')
  const checkColor = useColorModeValue('green', 'blue.400')

  const keepkeyButtonPromptTranslation: AwaitKeepKeyProps['translation'] = useMemo(
    () => ['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }],
    [setting],
  )

  useEffect(() => {
    if (deviceTimeout?.value) {
      setRadioTimeout(deviceTimeout.value)
    }
  }, [deviceTimeout?.value])

  return (
    <SubMenuContainer>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: 'Timeout',
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.timeout')}
      />
      <SubMenuBody>
        <LastDeviceInteractionStatus setting='timeout' />
        <Radio
          showCheck
          options={timeoutOptions}
          onChange={handleChange}
          colorScheme={colorScheme}
          defaultValue={radioTimeout}
          checkColor={checkColor}
          isLoading={awaitingDeviceInteraction}
          radioProps={radioProps}
          buttonGroupProps={radioButtonGroupProps}
        />
      </SubMenuBody>
      <AwaitKeepKey translation={keepkeyButtonPromptTranslation} />
    </SubMenuContainer>
  )
}
