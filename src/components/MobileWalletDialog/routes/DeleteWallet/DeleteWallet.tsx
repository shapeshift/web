import { Button, Heading } from '@chakra-ui/react'
import { AnimatePresence } from 'framer-motion'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import type { Location } from 'react-router-dom'
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { ConfirmDelete } from './Confirm'

import { MobileWalletDialogRoutes } from '@/components/MobileWalletDialog/types'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { SlideTransition } from '@/components/SlideTransition'
import type { MobileLocationState } from '@/context/WalletProvider/MobileWallet/types'

export const DeleteWallet = () => {
  const location: Location<MobileLocationState> = useLocation()
  const {
    state: { vault },
  } = location
  const navigate = useNavigate()
  const translate = useTranslate()

  const handleBack = useCallback(() => {
    navigate(MobileWalletDialogRoutes.Saved)
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
        <AnimatePresence mode='wait' initial={false}>
          <Routes>
            <Route
              path={MobileWalletDialogRoutes.ConfirmDelete}
              element={<ConfirmDelete vault={vault} onBack={handleBack} />}
            />
            <Route path='/' element={<ConfirmDelete vault={vault} onBack={handleBack} />} />
          </Routes>
        </AnimatePresence>
      </MemoryRouter>
    </SlideTransition>
  )
}
