import { InfoIcon } from '@chakra-ui/icons'
import { Alert, AlertIcon, Button, Flex, Input } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from 'components/Text'
import { useKeepKeyWallet } from 'context/WalletProvider/KeepKey/hooks/useKeepKeyWallet'
import { useWallet } from 'context/WalletProvider/WalletProvider'

export const ChangeLabel = () => {
  const translate = useTranslate()
  const { awaitingButtonPress, setAwaitingButtonPress, keepKeyUpdateStatus, handleKeepKeyEvents } =
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
        title={translate('walletProvider.keepKey.settings.headings.deviceLabel')}
        description={translate('walletProvider.keepKey.settings.descriptions.label')}
      />
      {keepKeyUpdateStatus && (
        <Alert
          status={keepKeyUpdateStatus === 'success' ? 'success' : 'error'}
          borderRadius='lg'
          mb={3}
          fontWeight='semibold'
          color={keepKeyUpdateStatus === 'success' ? 'green.200' : 'yellow.200'}
          fontSize='sm'
        >
          <AlertIcon color={keepKeyUpdateStatus === 'success' ? 'green.200' : 'yellow.200'} />
          {keepKeyUpdateStatus === 'success'
            ? translate('walletProvider.keepKey.settings.descriptions.labelUpdateSuccess')
            : translate('walletProvider.keepKey.settings.descriptions.labelUpdateFailed')}
        </Alert>
      )}
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
            translation='walletProvider.keepKey.settings.descriptions.labelButtonPrompt'
            ml={3}
            fontWeight='medium'
            color='blue.200'
          />
        </Flex>
      ) : (
        <Button colorScheme='blue' size='sm' onClick={handleChangeLabelInitializeEvent}>
          {translate('walletProvider.keepKey.settings.actions.updateLabel')}
        </Button>
      )}
    </Flex>
  )
}
