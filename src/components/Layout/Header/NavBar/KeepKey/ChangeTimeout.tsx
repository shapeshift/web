import { InfoIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Radio, RadioOption } from 'components/Radio/Radio'
import { Text } from 'components/Text'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'

export enum Timeout {
  TenMinutes = '600000',
  FifteenMinutes = '900000',
  TwentyMinutes = '1200000',
  ThirtyMinutes = '1800000',
  FortyFiveMinutes = '2700000',
  SixtyMinutes = '3600000'
}

export const ChangeTimeout = () => {
  const translate = useTranslate()
  const { awaitingButtonPress, setAwaitingButtonPress, handleKeepKeyEvents } =
    useKeepKeyMenuEventHandler()
  const { wallet } = useKeepKeyWallet()

  const options: RadioOption<Timeout>[] = [
    {
      value: Timeout.TenMinutes,
      label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '10' }]
    },
    {
      value: Timeout.FifteenMinutes,
      label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '15' }]
    },
    {
      value: Timeout.TwentyMinutes,
      label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '20' }]
    },
    {
      value: Timeout.ThirtyMinutes,
      label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '30' }]
    },
    {
      value: Timeout.FortyFiveMinutes,
      label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '45' }]
    },
    {
      value: Timeout.SixtyMinutes,
      label: ['walletProvider.keepKey.settings.descriptions.timeoutDuration', { minutes: '60' }]
    }
  ]

  const handleChangeTimeoutInitializeEvent = async (value: Timeout) => {
    const parsedTimeout = value ? parseInt(value) : parseInt(Timeout.TenMinutes)
    handleKeepKeyEvents()
    setAwaitingButtonPress(true)
    await wallet?.applySettings({ autoLockDelayMs: parsedTimeout })
  }

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: 'Timeout'
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.timeout')}
      />
      <ShowUpdateStatus setting='timeout' />
      {awaitingButtonPress ? (
        <Flex>
          <InfoIcon color='blue.200' mt={1} />
          <Text
            translation={[
              'walletProvider.keepKey.settings.descriptions.buttonPrompt',
              { setting: 'timeout' }
            ]}
            ml={3}
            fontWeight='medium'
            color='blue.200'
          />
        </Flex>
      ) : (
        <Radio
          options={options}
          onChange={handleChangeTimeoutInitializeEvent}
          colorScheme='white'
          buttonGroupProps={{
            display: 'flex',
            flexDirection: 'column',
            width: 'full',
            textColor: 'white',
            alignItems: 'flex-start',
            spacing: '0'
          }}
        />
      )}
    </Flex>
  )
}
