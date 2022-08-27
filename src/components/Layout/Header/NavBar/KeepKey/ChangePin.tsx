import { Button, Flex } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { KeepKeyPin } from 'context/WalletProvider/KeepKey/components/Pin'
import { PinMatrixRequestType } from 'context/WalletProvider/KeepKey/KeepKeyTypes'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'

import { useMenuRoutes } from '../hooks/useMenuRoutes'
import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'
import { LastDeviceInteractionStatus } from './LastDeviceInteractionStatus'

const moduleLogger = logger.child({
  namespace: ['Layout', 'Header', 'NavBar', 'KeepKey', 'ChangePin'],
})

export const ChangePin = () => {
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()
  const {
    state: {
      keepKeyPinRequestType,
      deviceState: { awaitingDeviceInteraction, isUpdatingPin },
    },
    setDeviceState,
  } = useWallet()
  const toast = useToast()

  const translationType = (() => {
    switch (keepKeyPinRequestType) {
      case PinMatrixRequestType.NEWFIRST:
        return 'newPin'
      case PinMatrixRequestType.NEWSECOND:
        return 'newPinConfirm'
      default:
        return 'pin'
    }
  })()

  const handleChangePin = async () => {
    const fnLogger = moduleLogger.child({ namespace: ['handleChangePin'] })
    fnLogger.trace('Applying new PIN...')

    setDeviceState({
      isUpdatingPin: true,
      lastDeviceInteractionStatus: false,
    })

    await keepKeyWallet?.changePin().catch(e => {
      fnLogger.error(e, 'Error applying new PIN')
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })

    setDeviceState({
      isUpdatingPin: false,
    })

    fnLogger.trace('PIN Changed')
  }
  const setting = 'PIN'

  const shouldDisplayPinView = isUpdatingPin && !awaitingDeviceInteraction

  const renderPinState: JSX.Element = (() => {
    return shouldDisplayPinView ? (
      <>
        <SubMenuBody>
          <KeepKeyPin translationType={translationType} />
        </SubMenuBody>
      </>
    ) : (
      <>
        <SubMenuBody>
          <LastDeviceInteractionStatus setting={setting} />
          <Button
            colorScheme='blue'
            size='sm'
            onClick={handleChangePin}
            isLoading={awaitingDeviceInteraction}
          >
            {translate('walletProvider.keepKey.settings.actions.update', { setting })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey
          translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        />
      </>
    )
  })()

  return (
    <SubMenuContainer>
      <Flex flexDir='column'>
        {!shouldDisplayPinView ? (
          <SubmenuHeader
            title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
              setting,
            })}
            description={translate('walletProvider.keepKey.settings.descriptions.pin')}
          />
        ) : (
          <SubmenuHeader title={translate(`walletProvider.keepKey.${translationType}.header`)} />
        )}
        {renderPinState}
      </Flex>
    </SubMenuContainer>
  )
}
