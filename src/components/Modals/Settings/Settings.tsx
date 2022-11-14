import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import type { MobileMessageEvent } from 'plugins/mobile'
import { useEffect } from 'react'
import { MemoryRouter, useHistory } from 'react-router-dom'
import { useModal } from 'hooks/useModal/useModal'

import { SettingsRoutes } from './SettingsCommon'
import { SettingsRouter } from './SettingsRouter'

export const entries = Object.values(SettingsRoutes)

const Settings = () => {
  /**
   * Since inner routes require app history to be able to navigate
   * to other pages, we need to pass outer-history down to the router
   */
  const appHistory = useHistory()
  const { settings } = useModal()
  const { close, isOpen } = settings

  /**
   * we want a way to be able to navigate to the flags page via the mobile app
   * this allows a user to open the settings modal and shake the device
   * to be taken to the flags page
   *
   * this is designed such that it's unlikely to be inadvertently triggered by a regular user
   */
  useEffect(() => {
    if (!isOpen) return
    const shakeEventListener = (e: MessageEvent<MobileMessageEvent>) => {
      if (e.data?.cmd === 'shakeEvent' && isOpen) void appHistory.push('/flags') || close()
    }

    window.addEventListener('message', shakeEventListener)
    return () => window.removeEventListener('message', shakeEventListener)
  }, [appHistory, close, isOpen])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <SettingsRouter appHistory={appHistory} />
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const SettingsModal = Settings
