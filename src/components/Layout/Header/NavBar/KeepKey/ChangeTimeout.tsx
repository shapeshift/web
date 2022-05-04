import { useColorModeValue } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Radio } from 'components/Radio/Radio'
import { DeviceTimeout, timeoutOptions, useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

const moduleLogger = logger.child({
  namespace: ['Layout', 'Header', 'NavBar', 'KeepKey', 'ChangeTimeout'],
})

export const ChangeTimeout = () => {
  const translate = useTranslate()
  const {
    keepKeyWallet,
    state: { deviceTimeout },
  } = useKeepKey()
  const {
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()
  const toast = useToast()
  const [radioTimeout, setRadioTimeout] = useState<DeviceTimeout>()

  const handleChange = async (value: DeviceTimeout) => {
    const fnLogger = moduleLogger.child({ namespace: ['handleChange'] })

    const parsedTimeout = value ? parseInt(value) : parseInt(DeviceTimeout.TenMinutes)
    fnLogger.trace({ autoLockDelayMs: parsedTimeout }, 'Applying autoLockDelayMs...')

    value && setRadioTimeout(value)
    await keepKeyWallet?.applySettings({ autoLockDelayMs: parsedTimeout }).catch(e => {
      fnLogger.error(e, { autoLockDelayMs: parsedTimeout }, 'Error applying autoLockDelayMs')
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })

    fnLogger.trace({ autoLockDelayMs: parsedTimeout }, 'Applied autoLockDelayMs')
  }

  const setting = 'timeout'
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
          radioProps={{ width: 'full', justifyContent: 'flex-start' }}
          buttonGroupProps={{
            display: 'flex',
            flexDirection: 'column',
            width: 'full',
            alignItems: 'flex-start',
            flex: 1,
            spacing: '0',
          }}
        />
      </SubMenuBody>
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
      />
    </SubMenuContainer>
  )
}
