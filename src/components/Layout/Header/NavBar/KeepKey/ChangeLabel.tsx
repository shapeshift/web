import { Button, Flex, Input, useColorModeValue, useToast } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

const moduleLogger = logger.child({
  namespace: ['Layout', 'Header', 'NavBar', 'KeepKey', 'ChangeLabel'],
})

export const ChangeLabel = () => {
  const translate = useTranslate()
  const toast = useToast()
  const { state } = useWallet()
  const { walletInfo } = state
  const { keepKeyWallet } = useKeepKey()
  const {
    state: {
      deviceState: { awaitingDeviceInteraction },
    },
  } = useWallet()
  const [keepKeyLabel, setKeepKeyLabel] = useState(walletInfo?.name)

  const handleChangeLabelInitializeEvent = async () => {
    const fnLogger = moduleLogger.child({
      namespace: ['handleChangeLabelInitializeEvent'],
      keepKeyLabel,
    })
    fnLogger.trace('Applying Label...')

    await keepKeyWallet?.applySettings({ label: keepKeyLabel }).catch(e => {
      fnLogger.error(e, 'Error applying KeepKey settings')
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })

    fnLogger.trace('KeepKey Label Applied')
  }
  const setting = 'label'
  const inputBackground = useColorModeValue('white', 'gray.800')
  const placeholderOpacity = useColorModeValue(0.6, 0.4)

  return (
    <SubMenuContainer>
      <Flex flexDir='column'>
        <SubmenuHeader
          title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
            setting,
          })}
          description={translate('walletProvider.keepKey.settings.descriptions.label')}
        />
        <SubMenuBody>
          <LastDeviceInteractionStatus setting={setting} />
          <Input
            type='text'
            placeholder={translate('walletProvider.keepKey.settings.placeholders.label')}
            _placeholder={{ opacity: placeholderOpacity, color: 'inherit' }}
            size='md'
            background={inputBackground}
            onChange={e => setKeepKeyLabel(e.target.value)}
            value={keepKeyLabel}
            autoFocus
            disabled={awaitingDeviceInteraction}
          />
          <Button
            isLoading={awaitingDeviceInteraction}
            colorScheme='blue'
            size='sm'
            onClick={handleChangeLabelInitializeEvent}
          >
            {translate('walletProvider.keepKey.settings.actions.update', { setting })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey
          translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        />
      </Flex>
    </SubMenuContainer>
  )
}
