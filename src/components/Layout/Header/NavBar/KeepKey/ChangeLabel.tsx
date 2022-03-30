import { Button, Flex, Input } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const ChangeLabel = () => {
  const translate = useTranslate()
  const { state } = useWallet()
  const { walletInfo } = state
  const { keepKeyWallet } = useKeepKey()
  const [keepKeyLabel, setKeepKeyLabel] = useState(walletInfo?.name)

  const handleChangeLabelInitializeEvent = async () => {
    await keepKeyWallet?.applySettings({ label: keepKeyLabel })
  }
  const setting = 'label'

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
        _placeholder={{ opacity: 0.4, color: 'inherit' }}
        mb={3}
        size='md'
        background='gray.800'
        onChange={e => setKeepKeyLabel(e.target.value)}
        value={keepKeyLabel}
        autoFocus // eslint-disable-line jsx-a11y/no-autofocus
      />
      <AwaitKeepKey setting='label'>
        <Button colorScheme='blue' size='sm' onClick={handleChangeLabelInitializeEvent}>
          {translate('walletProvider.keepKey.settings.actions.update', { setting })}
        </Button>
      </AwaitKeepKey>
    </Flex>
  )
}
