import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { useMenuRoutes, WalletConnectedRoutes } from '../hooks/useMenuRoutes'
import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

import { CircularProgress } from '@/components/CircularProgress/CircularProgress'
import type { AwaitKeepKeyProps } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { AwaitKeepKey } from '@/components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { useDeviceSettingToast } from '@/components/Layout/Header/NavBar/KeepKey/hooks/useDeviceSettingToast'
import { SubmenuHeader } from '@/components/Layout/Header/NavBar/SubmenuHeader'
import { Text } from '@/components/Text'
import { WalletActions } from '@/context/WalletProvider/actions'
import { KeepKeyPin } from '@/context/WalletProvider/KeepKey/components/Pin'
import { PinMatrixRequestType } from '@/context/WalletProvider/KeepKey/KeepKeyTypes'
import { useKeepKey } from '@/context/WalletProvider/KeepKeyProvider'
import { useWallet } from '@/hooks/useWallet/useWallet'

const gridProps = { spacing: 2 }

const SETTING = 'PIN'

export const ChangePin = () => {
  const navigate = useNavigate()
  const { toastSuccess, toastError } = useDeviceSettingToast(SETTING)

  const { handleBackClick } = useMenuRoutes()
  const translate = useTranslate()
  const {
    state: { keepKeyWallet },
  } = useKeepKey()
  const {
    dispatch,
    state: {
      keepKeyPinRequestType,
      deviceState: { awaitingDeviceInteraction, isUpdatingPin, isCancellingPin, isDeviceLoading },
    },
    setDeviceState,
  } = useWallet()
  const keepKeyWalletRef = useRef(keepKeyWallet)
  const setDeviceStateRef = useRef(setDeviceState)
  const isUpdatingPinRef = useRef(isUpdatingPin)

  useEffect(() => {
    keepKeyWalletRef.current = keepKeyWallet
    setDeviceStateRef.current = setDeviceState
    isUpdatingPinRef.current = isUpdatingPin
  }, [isUpdatingPin, keepKeyWallet, setDeviceState])

  const pinButtonBackground = useColorModeValue('gray.200', 'gray.600')
  const pinButtonBackgroundHover = useColorModeValue('gray.100', 'text.subtle')

  const translationType = (() => {
    switch (keepKeyPinRequestType) {
      case PinMatrixRequestType.NEWFIRST:
        return 'newPin'
      case PinMatrixRequestType.NEWSECOND:
        return 'newPinConfirm'
      default:
        return 'currentPin'
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

  useEffect(() => {
    return () => {
      if (!isUpdatingPinRef.current) return

      // The drawer can unmount this mid-flow, and a stale isUpdatingPin routes the device's
      // next pin request to a view that is gone
      keepKeyWalletRef.current
        ?.cancel()
        .catch(e => console.error('KeepKey: cancel on unmount failed', e))
      setDeviceStateRef.current({
        isUpdatingPin: false,
        isCancellingPin: false,
        awaitingDeviceInteraction: false,
      })
    }
  }, [])

  const handleCancel = useCallback(async () => {
    // isUpdatingPin routes in-flight requests, so hide the pad with its own flag rather than
    // clearing it early
    setDeviceState({ isCancellingPin: true })

    try {
      await keepKeyWallet?.cancel()
      // Back navigation can unmount before the ref resyncs, and cleanup would cancel again
      isUpdatingPinRef.current = false
      setDeviceState({
        isUpdatingPin: false,
        isCancellingPin: false,
        awaitingDeviceInteraction: false,
      })
    } catch (e) {
      // The device is still mid-flow, so return to the pad rather than the idle view, and leave
      // isUpdatingPin set so a second change cannot start and unmount cleanup still retries
      setDeviceState({ isCancellingPin: false })
      toastError(e)
    }
  }, [keepKeyWallet, setDeviceState, toastError])

  // AwaitKeepKey clears awaitingDeviceInteraction before cancelling, which would flash the pad
  const handleAwaitCancel = useCallback(() => {
    setDeviceState({ isCancellingPin: true })
  }, [setDeviceState])

  const handleHeaderBackClick = useCallback(async () => {
    await handleCancel()

    await handleBackClick()
  }, [handleBackClick, handleCancel])

  const handleChangePin = useCallback(async () => {
    // Cancelling hides the pad, which re-exposes this button while cancel is still in flight
    if (!keepKeyWallet || isCancellingPin) return

    setDeviceState({
      isUpdatingPin: true,
      awaitingDeviceInteraction: true,
      isCancellingPin: false,
    })

    dispatch({ type: WalletActions.RESET_LAST_DEVICE_INTERACTION_STATE })

    try {
      await keepKeyWallet.changePin()
      toastSuccess()
      // Navigating unmounts this before the ref resyncs, and the cleanup would cancel a success
      isUpdatingPinRef.current = false
      // Nothing left to do on this panel
      navigate(WalletConnectedRoutes.Connected)
    } catch (e) {
      toastError(e)
    } finally {
      setDeviceState({
        isUpdatingPin: false,
        isCancellingPin: false,
        awaitingDeviceInteraction: false,
      })
    }
  }, [dispatch, isCancellingPin, keepKeyWallet, navigate, setDeviceState, toastError, toastSuccess])

  const shouldDisplayEntryPinView = isUpdatingPin && !awaitingDeviceInteraction && !isCancellingPin

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
          <Button
            colorScheme='blue'
            size='sm'
            onClick={handleChangePin}
            isLoading={awaitingDeviceInteraction || isCancellingPin}
          >
            {translate('walletProvider.keepKey.settings.actions.update', {
              setting: upperFirst(SETTING),
            })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey
          translation={awaitKeepkeyButtonPromptTranslation}
          onCancel={handleAwaitCancel}
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
              setting: upperFirst(SETTING),
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
