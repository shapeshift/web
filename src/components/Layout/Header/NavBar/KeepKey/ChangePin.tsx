import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import type { JSX } from 'react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { useMenuRoutes } from '../hooks/useMenuRoutes'
import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'
import { LastDeviceInteractionStatus } from './LastDeviceInteractionStatus'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { AwaitKeepKeyProps } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { SubmenuHeader } from '@/components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeepKeyPin } from '@/context/WalletProvider/KeepKey/components/Pin'
import { PinMatrixRequestType } from '@/context/WalletProvider/KeepKey/KeepKeyTypes'
import { useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

const gridProps = { spacing: 2 }

const SETTING = 'PIN'

export const ChangePin = () => {
  const { handleBackClick } = useMenuRoutes()
  const translate = useTranslate()
  const {
    state: { keepKeyWallet },
  } = useKeepKey()
  const {
    dispatch,
    state: {
      keepKeyPinRequestType,
      deviceState: { awaitingDeviceInteraction, isUpdatingPin, isDeviceLoading },
    },
    setDeviceState,
  } = useWallet()
  const toast = useNotificationToast({ desktopPosition: 'top-right' })
  const pinButtonBackground = useColorModeValue('gray.200', 'gray.600')
  const pinButtonBackgroundHover = useColorModeValue('gray.100', 'text.subtle')

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

  const keepkeyPinButtonProps = useMemo(
    () => ({
      size: 'sm',
      p: 2,
      height: 12,
      background: pinButtonBackground,
      _hover: { background: pinButtonBackgroundHover },
    }),
    [pinButtonBackground, pinButtonBackgroundHover],
  )

  const awaitKeepkeyButtonPromptTranslation: AwaitKeepKeyProps['translation'] = useMemo(
    () => ['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting: SETTING }],
    [],
  )

  const handleCancel = useCallback(async () => {
    await keepKeyWallet
      ?.cancel()
      .catch(e => {
        console.error(e)
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
  }, [keepKeyWallet, setDeviceState, toast, translate])

  const handleHeaderBackClick = useCallback(async () => {
    await handleCancel()

    await handleBackClick()
  }, [handleBackClick, handleCancel])

  const handleChangePin = useCallback(async () => {
    setDeviceState({
      isUpdatingPin: true,
      awaitingDeviceInteraction: true,
    })

    dispatch({ type: WalletActions.RESET_LAST_DEVICE_INTERACTION_STATE })

    await keepKeyWallet
      ?.changePin()
      .catch(e => {
        console.error(e)
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
  }, [dispatch, keepKeyWallet, setDeviceState, toast, translate])

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
                  buttonsProps={keepkeyPinButtonProps}
                  gridProps={gridProps}
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
          <LastDeviceInteractionStatus setting={SETTING} />
          <Button
            colorScheme='blue'
            size='sm'
            onClick={handleChangePin}
            isLoading={awaitingDeviceInteraction}
          >
            {translate('walletProvider.keepKey.settings.actions.update', { setting: SETTING })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey translation={awaitKeepkeyButtonPromptTranslation} />
      </>
    )
  })()

  return (
    <SubMenuContainer>
      <Flex flexDir='column'>
        {!shouldDisplayEntryPinView ? (
          <SubmenuHeader
            title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
              setting: SETTING,
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
