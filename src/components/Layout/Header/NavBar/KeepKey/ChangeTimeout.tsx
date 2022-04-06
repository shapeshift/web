import { Flex, useColorModeValue } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Radio } from 'components/Radio/Radio'
import { DeviceTimeout, timeoutOptions, useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export const ChangeTimeout = () => {
  const translate = useTranslate()
  const {
    keepKeyWallet,
    state: { deviceTimeout }
  } = useKeepKey()
  const [radioTimeout, setRadioTimeout] = useState(DeviceTimeout.TenMinutes)

  const handleChange = async (value: DeviceTimeout) => {
    const parsedTimeout = value ? parseInt(value) : parseInt(DeviceTimeout.TenMinutes)
    value && setRadioTimeout(value)
    await keepKeyWallet?.applySettings({ autoLockDelayMs: parsedTimeout })
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
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: 'Timeout'
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.timeout')}
      />
      <LastDeviceInteractionStatus setting='timeout' />
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
      >
        <Radio
          showCheck
          options={timeoutOptions}
          onChange={handleChange}
          colorScheme={colorScheme}
          defaultValue={radioTimeout}
          checkColor={checkColor}
          buttonGroupProps={{
            display: 'flex',
            flexDirection: 'column',
            width: 'full',
            alignItems: 'flex-start',
            spacing: '0'
          }}
        />
      </AwaitKeepKey>
    </Flex>
  )
}
