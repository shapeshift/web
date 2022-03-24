import { InfoIcon } from '@chakra-ui/icons'
import { Button, Flex, Input } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'
import { ShowUpdateStatus } from 'components/Layout/Header/NavBar/KeepKey/ShowUpdateStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from 'components/Text'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const ChangeLabel = () => {
  const translate = useTranslate()
  const { awaitingButtonPress, setAwaitingButtonPress, handleKeepKeyEvents } =
    useKeepKeyMenuEventHandler()
  const { state } = useWallet()
  const { walletInfo } = state
  const { wallet } = useKeepKeyWallet()
  const [keepKeyLabel, setKeepKeyLabel] = useState(walletInfo?.name)

  const handleChangeLabelInitializeEvent = async () => {
    handleKeepKeyEvents()
    setAwaitingButtonPress(true)
    await wallet?.applySettings({ label: keepKeyLabel })
  }

  return (
    <Flex flexDir='column' ml={3} mr={3} mb={3} maxWidth='300px'>
      <SubmenuHeader
        title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
          setting: 'Label'
        })}
        description={translate('walletProvider.keepKey.settings.descriptions.label')}
      />
      <ShowUpdateStatus setting='label' />
      <Input
        type='text'
        placeholder='Enter a device label'
        _placeholder={{ opacity: 0.4, color: 'inherit' }}
        mb={3}
        size='md'
        background='gray.800'
        onChange={e => setKeepKeyLabel(e.target.value)}
        value={keepKeyLabel}
        autoFocus // eslint-disable-line jsx-a11y/no-autofocus
      />
      {awaitingButtonPress ? (
        <Flex>
          <InfoIcon color='blue.200' mt={1} />
          <Text
            translation={[
              'walletProvider.keepKey.settings.descriptions.buttonPrompt',
              { setting: 'label' }
            ]}
            ml={3}
            fontWeight='medium'
            color='blue.200'
          />
        </Flex>
      ) : (
        <Button colorScheme='blue' size='sm' onClick={handleChangeLabelInitializeEvent}>
          {translate('walletProvider.keepKey.settings.actions.update', { setting: 'label' })}
        </Button>
      )}
    </Flex>
  )
}
