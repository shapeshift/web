import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { useTranslate } from 'react-polyglot'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from 'components/Text'
import { WalletActions } from 'context/WalletProvider/actions'
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
  const { handleBackClick } = useMenuRoutes()
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()
  const {
    dispatch,
    state: {
      keepKeyPinRequestType,
      deviceState: { awaitingDeviceInteraction, isUpdatingPin, isDeviceLoading },
    },
    setDeviceState,
  } = useWallet()
  const toast = useToast()
  const pinButtonBackground = useColorModeValue('gray.200', 'gray.600')
  const pinButtonBackgroundHover = useColorModeValue('gray.100', 'gray.500')

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

  const handleCancel = async () => {
    const fnLogger = moduleLogger.child({ namespace: ['handleChangePinBackClick'] })

    await keepKeyWallet
      ?.cancel()
      .catch(e => {
        fnLogger.error(e, 'Error cancelling new PIN...')
        toast({
          title: translate('common.error'),
          description: e?.message?.message ?? translate('common.somethingWentWrong'),
          status: 'error',
          isClosable: true,
        })
      })
      .finally(() => {
        setDeviceState({
          isUpdatingPin: false,
        })
      })
  }

  const handleHeaderBackClick = async () => {
    await handleCancel()

    await handleBackClick()
  }

  const handleChangePin = async () => {
    const fnLogger = moduleLogger.child({ namespace: ['handleChangePin'] })
    fnLogger.trace('Applying new PIN...')

    setDeviceState({
      isUpdatingPin: true,
      awaitingDeviceInteraction: true,
    })

    dispatch({ type: WalletActions.RESET_LAST_DEVICE_INTERACTION_STATE })

    await keepKeyWallet
      ?.changePin()
      .catch(e => {
        fnLogger.error(e, 'Error applying new PIN')
        toast({
          title: translate('common.error'),
          description: e?.message?.message ?? translate('common.somethingWentWrong'),
          status: 'error',
          isClosable: true,
        })
      })
      .finally(() => {
        setDeviceState({
          isUpdatingPin: false,
        })
      })

    fnLogger.trace('PIN Changed')
  }
  const setting = 'PIN'

  const shouldDisplayEntryPinView = isUpdatingPin && !awaitingDeviceInteraction

  const renderedPinState: JSX.Element = (() => {
    return shouldDisplayEntryPinView ? (
      <>
        <SubMenuBody>
          <Box textAlign='center'>
            {isDeviceLoading ? (
              <CircularProgress size='5' />
            ) : (
              <>
                <KeepKeyPin
                  translationType={translationType}
                  gridMaxWidth={'175px'}
                  confirmButtonSize={'md'}
                  buttonsProps={{
                    size: 'sm',
                    p: 2,
                    height: 12,
                    background: pinButtonBackground,
                    _hover: { background: pinButtonBackgroundHover },
                  }}
                  gridProps={{ spacing: 2 }}
                />
                <Button width='full' onClick={handleCancel} mt={2}>
                  <Text translation={`common.cancel`} />
                </Button>
              </>
            )}
          </Box>
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
        {!shouldDisplayEntryPinView ? (
          <SubmenuHeader
            title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
              setting,
            })}
            description={translate('walletProvider.keepKey.settings.descriptions.pin')}
            onBackClick={handleHeaderBackClick}
          />
        ) : (
          <SubmenuHeader title={translate(`walletProvider.keepKey.${translationType}.header`)} />
        )}
        {renderedPinState}
      </Flex>
    </SubMenuContainer>
  )
}
