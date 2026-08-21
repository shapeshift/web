import { useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

import type { AwaitKeepKeyProps } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { useDeviceSettingToast } from '@/components/Layout/Header/NavBar/KeepKey/hooks/useDeviceSettingToast'
import { SubmenuHeader } from '@/components/Layout/Header/NavBar/SubmenuHeader'
import { Radio } from '@/components/Radio/Radio'
import { DeviceTimeout, timeoutOptions, useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
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

const setting = 'timeout'
const keepkeyButtonPromptTranslation: AwaitKeepKeyProps['translation'] = [
  'walletProvider.keepKey.settings.descriptions.buttonPrompt',
  { setting },
]

export const ChangeTimeout = () => {
  const { toastSuccess, toastError } = useDeviceSettingToast(setting)

  const translate = useTranslate()
  const {
    state: { deviceTimeout, keepKeyWallet },
  } = useKeepKey()
  const {
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()
  const [radioTimeout, setRadioTimeout] = useState<DeviceTimeout>()
  // A queued second change would be rolled back by the first one failing
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback(
    async (value: DeviceTimeout) => {
      if (!keepKeyWallet || isSubmitting) return

      setIsSubmitting(true)

      const parsedTimeout = value ? parseInt(value) : parseInt(DeviceTimeout.TenMinutes)

      const previousTimeout = radioTimeout
      value && setRadioTimeout(value)

      try {
        await keepKeyWallet.applySettings({ autoLockDelayMs: parsedTimeout })
        toastSuccess()
      } catch (e) {
        // Cancelling is silent, so leaving the radio moved would be the only thing the user sees
        setRadioTimeout(previousTimeout)
        toastError(e)
      } finally {
        setIsSubmitting(false)
      }
    },
    [isSubmitting, keepKeyWallet, radioTimeout, toastError, toastSuccess],
  )

  const colorScheme = useColorModeValue('blackAlpha', 'white')
  const checkColor = useColorModeValue('green', 'blue.400')

  useEffect(() => {
    if (deviceTimeout?.value) {
      setRadioTimeout(deviceTimeout.value)
    }
  }, [deviceTimeout?.value])

  return (
    <SubMenuContainer>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: upperFirst(setting),
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.timeout')}
      />
      <SubMenuBody>
        <Radio
          showCheck
          options={timeoutOptions}
          onChange={handleChange}
          colorScheme={colorScheme}
          value={radioTimeout}
          defaultValue={radioTimeout}
          checkColor={checkColor}
          isLoading={awaitingDeviceInteraction || isSubmitting}
          radioProps={radioProps}
          buttonGroupProps={radioButtonGroupProps}
        />
      </SubMenuBody>
      <AwaitKeepKey translation={keepkeyButtonPromptTranslation} />
    </SubMenuContainer>
  )
}
