import { Button, Flex, Input, useColorModeValue } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

export const ChangeLabel = () => {
  const translate = useTranslate()
  const { state } = useWallet()
  const { walletInfo } = state
  const {
    keepKeyWallet,
    state: { awaitingButtonPress }
  } = useKeepKey()
  const [keepKeyLabel, setKeepKeyLabel] = useState(walletInfo?.name)

  const handleChangeLabelInitializeEvent = async () => {
    await keepKeyWallet?.applySettings({ label: keepKeyLabel })
  }
  const setting = 'label'
  const inputBackground = useColorModeValue('white', 'gray.800')
  const placeholderOpacity = useColorModeValue(0.6, 0.4)

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.label')}
      />
      <ShowUpdateStatus setting={setting} />
      <Input
        type='text'
        placeholder={translate('walletProvider.keepKey.settings.placeholders.label')}
        _placeholder={{ opacity: placeholderOpacity, color: 'inherit' }}
        mb={3}
        size='md'
        background={inputBackground}
        onChange={e => setKeepKeyLabel(e.target.value)}
        value={keepKeyLabel}
        autoFocus // eslint-disable-line jsx-a11y/no-autofocus
        disabled={awaitingButtonPress}
      />
      <AwaitKeepKey
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
      >
        <Button colorScheme='blue' size='sm' onClick={handleChangeLabelInitializeEvent}>
          {translate('walletProvider.keepKey.settings.actions.update', { setting })}
        </Button>
      </AwaitKeepKey>
    </Flex>
  )
}
