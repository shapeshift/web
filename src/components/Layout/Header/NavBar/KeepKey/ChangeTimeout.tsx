import { Flex, useColorModeValue } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Radio } from 'components/Radio/Radio'
import { DeviceTimeout, timeoutOptions, useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export const ChangeTimeout = () => {
  const translate = useTranslate()
  const { keepKeyWallet, deviceTimeout } = useKeepKey()

  const handleChangeTimeoutInitializeEvent = async (value: DeviceTimeout) => {
    const parsedTimeout = value ? parseInt(value) : parseInt(DeviceTimeout.TenMinutes)
    await keepKeyWallet?.applySettings({ autoLockDelayMs: parsedTimeout })
  }
  const setting = 'timeout'
  const colorScheme = useColorModeValue('blackAlpha', 'white')
  const checkColor = useColorModeValue('green', 'blue.400')
  const defaultValue = deviceTimeout ? deviceTimeout.value : DeviceTimeout.TenMinutes

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: 'Timeout'
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.timeout')}
      />
      <ShowUpdateStatus setting='timeout' />
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
      >
        <Radio
          showCheck
          options={timeoutOptions}
          onChange={handleChangeTimeoutInitializeEvent}
          colorScheme={colorScheme}
          defaultValue={defaultValue}
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
