import { useEffect } from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'

import { SettingsRoutes } from './SettingsCommon'
import { SettingsRouter } from './SettingsRouter'

import { Dialog } from '@/components/Modal/components/Dialog'
import { useModal } from '@/hooks/useModal/useModal'
import type { MobileMessageEvent } from '@/plugins/mobile'

export const entries = Object.values(SettingsRoutes)

const Settings = () => {
  // Settings requires a separate "outer" level history context to be passed down to the SettingsRouter
  // for the secret flags menu to work on mobile
  const appHistory = useNavigate()

  const settings = useModal('settings')
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
      // Only accept messages from the mobile app WebView, which does not set a web origin
      // and is only present when running in the RN environment. Any other origins are ignored.
      if (e.origin && e.origin !== 'null' && e.origin !== 'file://') return
      if (e.data?.cmd === 'shakeEvent' && isOpen) {
        appHistory('/flags')
        close()
      }
    }

    window.addEventListener('message', shakeEventListener)
    return () => window.removeEventListener('message', shakeEventListener)
  }, [appHistory, close, isOpen])

  return (
    <Dialog id='settings-modal' isOpen={isOpen} onClose={close} height='auto'>
      <MemoryRouter initialEntries={entries} initialIndex={0}>
        <SettingsRouter />
      </MemoryRouter>
    </Dialog>
  )
}

export const SettingsModal = Settings
