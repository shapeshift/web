import { Modal, ModalContent, ModalOverlay } from '@chakra-ui/react'
import { MemoryRouter, Route, Switch, useHistory } from 'react-router-dom'
import { useModal } from 'context/ModalProvider/ModalProvider'

import { SettingsRouter } from './SettingsRouter'

export enum SettingsRoutes {
  Index = '/settings/index',
  Languages = '/receive/languages'
}

export const entries = [SettingsRoutes.Index, SettingsRoutes.Languages]

const Settings = () => {
  /**
   * Since inner routes require app history to be able to navigate
   * to other pages, we need to pass outer-history down to the router
   */
  const appHistory = useHistory()
  const { settings } = useModal()
  const { close, isOpen } = settings

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent>
        <MemoryRouter initialEntries={entries}>
          <Switch>
            <Route path='/'>
              <SettingsRouter appHistory={appHistory} />
            </Route>
          </Switch>
        </MemoryRouter>
      </ModalContent>
    </Modal>
  )
}

export const SettingsModal = Settings
