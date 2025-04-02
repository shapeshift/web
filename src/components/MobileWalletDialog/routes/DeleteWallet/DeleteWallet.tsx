import { Button, Heading } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Location } from 'react-router-dom'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { Route, Switch } from 'wouter'

import { ConfirmDelete } from './Confirm'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { SlideTransition } from '@/components/SlideTransition'
import type { RevocableWallet } from '@/context/WalletProvider/MobileWallet/RevocableWallet'
import type { MobileLocationState } from '@/context/WalletProvider/MobileWallet/types'

const DeleteWalletRoutes = ({
  vault,
  handleBack,
}: {
  vault: RevocableWallet | undefined
  handleBack: () => void
}) => {
  const location = useLocation()
  const confirmDelete = useMemo(
    () => (vault ? <ConfirmDelete vault={vault} onBack={handleBack} /> : null),
    [handleBack, vault],
  )

  return (
    <Switch location={location.pathname}>
      <Route path={MobileWalletDialogRoutes.ConfirmDelete}>{confirmDelete}</Route>
      <Route path='/'>{confirmDelete}</Route>
    </Switch>
  )
}

export const DeleteWallet = () => {
  const location: Location<MobileLocationState> = useLocation()
  const {
    state: { vault },
  } = location
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    navigate(-1)
  }, [navigate])

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
        <AnimatePresence mode='wait' initial={false}>
          <DeleteWalletRoutes vault={vault} handleBack={handleBack} />
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}
