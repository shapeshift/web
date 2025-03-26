import { Button, Heading } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { MemoryRouter, Redirect, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { ConfirmDelete } from './Confirm'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { SlideTransition } from '@/components/SlideTransition'
import type { MobileLocationState } from '@/context/WalletProvider/MobileWallet/types'

const confirmDeleteRedirect = () => <Redirect to={MobileWalletDialogRoutes.ConfirmDelete} />

export const DeleteWallet = () => {
  const {
    state: { vault },
  } = useLocation<MobileLocationState>()
  const history = useHistory()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    history.push(MobileWalletDialogRoutes.Saved)
  }, [history])

  if (!vault)
    return (
      <SlideTransition>
        <DialogBody>
          <Heading size='md' textAlign='center' maxWidth='250px' mx='auto'>
            {translate('common.somethingWentWrong')}
          </Heading>
          <Button onClick={handleBack} mx='auto'>
            {translate('common.goBack')}
          </Button>
        </DialogBody>
      </SlideTransition>
    )

  return (
    <SlideTransition>
      <MemoryRouter>
        <Route>
          {({ location }) => (
            <AnimatePresence mode='wait' initial={false}>
              <Switch key={location.key} location={location}>
                <Route path={MobileWalletDialogRoutes.ConfirmDelete}>
                  <ConfirmDelete vault={vault} onBack={handleBack} />
                </Route>
                {/* TODO: This will change to backup in a follow up PR */}
                <Route
                  path='/'
                  render={confirmDeleteRedirect}
                />
              </Switch>
            </AnimatePresence>
          )}
        </Route>
      </MemoryRouter>
    </SlideTransition>
  )
}
